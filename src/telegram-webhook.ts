import * as Sentry from "@sentry/node";
import { Hono } from "hono";
import {
  enqueueChatMessage,
  gateInbound,
  proWelcomeMessage,
  secretMatches,
  upgradeMessage,
} from "./channel-gate.js";
import { UNSUPPORTED_MESSAGE_TEXT } from "./inngest/channel-messages.js";
import { parseTelegramMessage, type TelegramUpdate } from "./inngest/inbound.js";
import { log } from "./log.js";
import { sendMessage } from "./inngest/telegram-api.js";

const SECRET_HEADER = "x-telegram-bot-api-secret-token";

// Telegram's webhook lands here first, and only private-chat messages that pass the channel gate
// are queued for the agent
export const telegramWebhook = new Hono().post("/", async (c) => {
  if (!secretMatches(c.req.header(SECRET_HEADER), process.env.TELEGRAM_WEBHOOK_SECRET)) {
    // Either a misconfigured secret (every message stops reaching the agent) or someone probing
    log.warn("Webhook rejected: secret mismatch", { "channel.platform": "telegram" });
    return c.text("Unauthorized", 401);
  }

  const update = await c.req.json<TelegramUpdate>();
  const message = update.message;
  // Private chats only; other updates are acknowledged so Telegram doesn't redeliver them
  if (!message?.from || message.chat.type !== "private") {
    return c.body(null, 200);
  }

  let gate;
  try {
    gate = await gateInbound({
      platform: "telegram",
      externalUserId: String(message.from.id),
      chatId: String(message.chat.id),
    });
  } catch (error) {
    // Telegram redelivers on a non-2xx, so a Clerk outage retries instead of dropping the message
    Sentry.captureException(error);
    log.error("Channel gate failed", {
      "channel.platform": "telegram",
      "channel.event_id": update.update_id,
    });
    return c.text("Upstream error", 502);
  }

  log.info("Channel message gated", {
    "channel.platform": "telegram",
    "channel.event_id": update.update_id,
    "channel.gate_status": gate.status,
  });

  switch (gate.status) {
    case "linking":
      return c.body(null, 200);
    case "upgrade":
      // Replying in the webhook response makes Telegram send the message, with no extra API call
      return c.json({ method: "sendMessage", chat_id: message.chat.id, text: upgradeMessage() });
    case "allowed": {
      const inbound = parseTelegramMessage(message);
      if (inbound.kind === "ignore") return c.body(null, 200);
      if (inbound.kind === "unsupported") {
        return c.json({ method: "sendMessage", chat_id: message.chat.id, text: UNSUPPORTED_MESSAGE_TEXT });
      }
      // The welcome goes out in this response, so it arrives before the agent's answer
      if (gate.welcome) {
        await sendMessage(message.chat.id, proWelcomeMessage());
      }
      const queued = await enqueueChatMessage({
        platform: "telegram",
        externalMessageId: inbound.externalMessageId,
        clerkUserId: gate.clerkUserId,
        chatId: inbound.chatId,
        parts: inbound.parts,
      });
      return queued ? c.body(null, 200) : c.text("Upstream error", 502);
    }
  }
});
