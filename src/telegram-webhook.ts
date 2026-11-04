import { timingSafeEqual } from "node:crypto";
import { idempotencyKeys, tasks } from "@trigger.dev/sdk";
import { Hono } from "hono";
import { findTelegramLink, linkIdempotencyKey } from "./db/channel-links.js";
import type { linkTelegramAccount } from "./trigger/link-account.js";

type TelegramUpdate = {
  update_id: number;
  message?: {
    chat: { id: number; type: "private" | "group" | "supergroup" | "channel" };
    from?: { id: number };
  };
};

const SECRET_HEADER = "x-telegram-bot-api-secret-token";

const secretMatches = (received: string | undefined, expected: string | undefined) => {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

// Telegram's webhook lands here first. Only messages from Telegram users linked to a Clerk account
// reach the agent, forwarded to the Trigger.dev endpoint with their Clerk user id attached;
// everyone else is sent a sign-in link instead
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

  const telegramUserId = String(message.from.id);
  const link = await findTelegramLink(telegramUserId);

  if (!link) {
    await tasks.trigger<typeof linkTelegramAccount>(
      "link-telegram-account",
      { telegramUserId, chatId: message.chat.id },
      {
        idempotencyKey: await idempotencyKeys.create(linkIdempotencyKey(telegramUserId), {
          scope: "global",
        }),
        // Matches the device code's lifetime; the run also clears the key as soon as it ends
        idempotencyKeyTTL: "10m",
        tags: [`telegram-user:${telegramUserId}`],
      }
    );
    return c.body(null, 200);
  }

  const res = await fetch(process.env.TRIGGER_TELEGRAM_WEBHOOK_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [SECRET_HEADER]: process.env.TRIGGER_TELEGRAM_WEBHOOK_SECRET!,
    },
    body: JSON.stringify({ ...update, clerkUserId: link.clerkUserId }),
  });
  if (!res.ok) {
    // A non-2xx makes Telegram redeliver; the Trigger endpoint dedupes on update_id
    console.error(`Forwarding update ${update.update_id} failed: ${res.status} ${await res.text()}`);
    return c.text("Upstream error", 502);
  }
  return c.body(null, 200);
});
