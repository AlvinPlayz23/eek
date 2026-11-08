import * as Sentry from "@sentry/node";
import { Hono } from "hono";
import { hasProPlan, upgradeUrl } from "./billing.js";
import {
  enqueueChatMessage,
  gateInbound,
  proWelcomeMessage,
  secretMatches,
  upgradeMessage,
} from "./channel-gate.js";
import { findChannelLink } from "./db/channel-links.js";
import { getUserEmail } from "./clerk-user.js";
import { UNSUPPORTED_MESSAGE_TEXT } from "./inngest/channel-messages.js";
import { parseTelegramMessage, type TelegramUpdate } from "./inngest/inbound.js";
import { log } from "./log.js";
import { sendMessage } from "./inngest/telegram-api.js";
import {
  HELP_TEXT,
  parseTelegramCommand,
  WHOAMI_NOT_LINKED_TEXT,
  whoamiText,
  type ParsedTelegramCommand,
} from "./telegram-commands.js";

const SECRET_HEADER = "x-telegram-bot-api-secret-token";

// Commands are answered in the webhook: they skip the gate, the inbox and Inngest. Unknown
// commands return null and take the normal message path
const commandReply = async (
  command: ParsedTelegramCommand,
  externalUserId: string
): Promise<string | null> => {
  switch (command.name) {
    case "help":
      return HELP_TEXT;
    case "whoami": {
      const link = await findChannelLink("telegram", externalUserId);
      if (!link) return WHOAMI_NOT_LINKED_TEXT;
      Sentry.setUser({ id: link.clerkUserId });
      let email: string | null = null;
      try {
        email = await getUserEmail(link.clerkUserId);
      } catch (error) {
        // The email is a nicety: /whoami still answers with the plan and linked date
        Sentry.captureException(error);
        log.warn("User email lookup failed", {
          "channel.platform": "telegram",
          "channel.command": command.name,
        });
      }
      let pro: boolean | null = null;
      try {
        pro = await hasProPlan(link.clerkUserId);
      } catch (error) {
        Sentry.captureException(error);
        log.warn("Plan lookup failed", {
          "channel.platform": "telegram",
          "channel.command": command.name,
        });
      }
      return whoamiText({
        email,
        pro,
        linkedAt: link.linkedAt,
        // Only needed without Pro; avoids requiring the publishable key just to answer
        upgradeUrl: pro === false ? upgradeUrl() : "",
      });
    }
    default:
      return null;
  }
};

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

  // Commands skip the gate and the agent, so they work whether or not the user is linked or on Pro
  const command = parseTelegramCommand(message.text);
  if (command) {
    const reply = await commandReply(command, String(message.from.id));
    if (reply !== null) {
      log.info("Channel command handled", {
        "channel.platform": "telegram",
        "channel.command": command.name,
      });
      return c.json({ method: "sendMessage", chat_id: message.chat.id, text: reply });
    }
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
