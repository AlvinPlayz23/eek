import { Hono } from "hono";
import { forwardToTrigger, gateInbound, secretMatches, upgradeMessage } from "./channel-gate.js";

type TelegramUpdate = {
  update_id: number;
  message?: {
    chat: { id: number; type: "private" | "group" | "supergroup" | "channel" };
    from?: { id: number };
  };
};

const SECRET_HEADER = "x-telegram-bot-api-secret-token";

// Telegram's webhook lands here first, and only private-chat messages that pass the channel gate
// are forwarded to the Trigger.dev endpoint
export const telegramWebhook = new Hono().post("/", async (c) => {
  if (!secretMatches(c.req.header(SECRET_HEADER), process.env.TELEGRAM_WEBHOOK_SECRET)) {
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
    console.error(`Gate for Telegram update ${update.update_id} failed:`, error);
    return c.text("Upstream error", 502);
  }

  switch (gate.status) {
    case "linking":
      return c.body(null, 200);
    case "upgrade":
      // Replying in the webhook response makes Telegram send the message, with no extra API call
      return c.json({ method: "sendMessage", chat_id: message.chat.id, text: upgradeMessage() });
    case "allowed": {
      const forwarded = await forwardToTrigger({
        url: process.env.TRIGGER_TELEGRAM_WEBHOOK_URL!,
        secretHeader: SECRET_HEADER,
        secret: process.env.TRIGGER_TELEGRAM_WEBHOOK_SECRET!,
        body: { ...update, clerkUserId: gate.clerkUserId },
      });
      return forwarded ? c.body(null, 200) : c.text("Upstream error", 502);
    }
  }
});
