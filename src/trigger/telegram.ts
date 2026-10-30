import { logger, webhook, webhooks } from "@trigger.dev/sdk";
import { chat, defaultStorage } from "@trigger.dev/sdk/ai";
import { neon } from "@neon/ai-sdk-provider";

type TelegramMessage = {
  message_id: number;
  chat: { id: number };
  from?: { id: number };
  text?: string;
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

// Telegram sends the secret_token passed to setWebhook in this header on every update
export const telegramEndpoint = webhooks.endpoint.define({
  id: "telegram",
  source: webhooks.custom<TelegramUpdate>(
    {
      scheme: "shared-secret",
      placement: "header",
      fieldName: "x-telegram-bot-api-secret-token",
      idempotencyField: { from: "body", name: "update_id" },
    },
    {
      setupPrompt:
        "Register the URL with the Telegram Bot API setWebhook method, passing the endpoint's generated secret as secret_token.",
    }
  ),
});

const sendMessage = async (chatId: number, text: string) => {
  const res = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    }
  );
  if (!res.ok) {
    throw new Error(`sendMessage failed: ${res.status} ${await res.text()}`);
  }
  const { result } = (await res.json()) as { result: { message_id: number } };
  return result.message_id;
};

// One durable session per Telegram chat: text messages become turns, replies are posted back
const telegramChannel = chat.channels.custom({
  id: "telegram",
  endpoint: telegramEndpoint,
  key: "telegram-{event.message.chat.id}",
  filter: "event.message.text != null",
  inbound: (update) => ({
    message: update.message!.text!,
    externalUserId: update.message!.from && String(update.message!.from.id),
    externalMessageId: String(update.message!.message_id),
  }),
  bind: (update) => ({ chatId: update.message!.chat.id }),
  outbound: (reply) => (reply.text ? { text: reply.text } : null),
  send: async (message, ctx) => {
    const chatId = ctx.handle?.chatId ?? ctx.event!.message!.chat.id;
    const messageId = await sendMessage(chatId, message.text);
    return { ref: String(messageId) };
  },
  errorMessage: "Sorry, something went wrong. Please try again.",
});

export const telegramAgent = chat.agent({
  id: "telegram-agent",
  channels: [telegramChannel],
  // The platform's transcript snapshot: a run that boots after the previous one ended
  // loads the conversation from it, so the agent remembers the chat without a database
  storage: defaultStorage,
  system: "You are a helpful, concise personal assistant chatting over Telegram.",
  run: async ({ messages, signal, streamText }) =>
    streamText({
      model: neon("gpt-5-4-nano"),
      messages,
      abortSignal: signal,
    }),
});

// The agent only takes text; tell the user instead of silently dropping photos, stickers, etc.
export const telegramUnsupportedMessage = webhook({
  id: "telegram-unsupported-message",
  endpoint: telegramEndpoint,
  filter: "event.message != null && event.message.text == null",
  onEvent: async ({ event }) => {
    logger.log("Unsupported Telegram message", { updateId: event.update_id });
    await sendMessage(event.message!.chat.id, "I can only read text messages for now.");
  },
});
