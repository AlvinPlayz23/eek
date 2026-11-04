import { logger, webhook, webhooks } from "@trigger.dev/sdk";
import { chat, defaultStorage } from "@trigger.dev/sdk/ai";
import { stepCountIs, type UIMessage } from "ai";
import { chatModel } from "./model.js";
import { computerTools, computerToolsInstructions, type ComputerSurface } from "./computer-tools.js";
import {
  downloadFile,
  MAX_DOWNLOAD_BYTES,
  MAX_UPLOAD_BYTES,
  sendFile,
  sendMessage,
} from "./telegram-api.js";
import { webTools, webToolsInstructions } from "./web-tools.js";

type TelegramFile = {
  file_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
};

type TelegramMessage = {
  message_id: number;
  chat: { id: number; type: "private" | "group" | "supergroup" | "channel" };
  from?: { id: number };
  text?: string;
  caption?: string;
  document?: TelegramFile;
  // The same photo in increasing sizes
  photo?: (TelegramFile & { width: number; height: number })[];
  audio?: TelegramFile;
  voice?: TelegramFile;
  video?: TelegramFile;
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  // Added by the Hono webhook, which forwards only updates from Telegram users linked to Clerk
  clerkUserId?: string;
};

// The Hono webhook forwards linked users' updates here with this endpoint's secret in the header
// Telegram itself uses, so the endpoint also keeps accepting Telegram directly until it is switched
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

// Telegram rejects messages over 4096 characters; break long replies on line boundaries
const TELEGRAM_MAX_LENGTH = 4096;

const splitMessage = (text: string) => {
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > TELEGRAM_MAX_LENGTH) {
    const cut = rest.lastIndexOf("\n", TELEGRAM_MAX_LENGTH);
    const end = cut > 0 ? cut : TELEGRAM_MAX_LENGTH;
    chunks.push(rest.slice(0, end));
    rest = rest.slice(end).replace(/^\n+/, "");
  }
  chunks.push(rest);
  return chunks;
};

type Attachment = { fileId: string; filename: string; mediaType: string; size?: number };

// A Telegram message carries at most one file; albums arrive as one message per item
const attachmentOf = (message: TelegramMessage): Attachment | undefined => {
  const id = message.message_id;
  const fromFile = (file: TelegramFile, fallbackName: string, fallbackType: string) => ({
    fileId: file.file_id,
    filename: file.file_name ?? fallbackName,
    mediaType: file.mime_type ?? fallbackType,
    size: file.file_size,
  });
  if (message.document) {
    return fromFile(message.document, `file-${id}`, "application/octet-stream");
  }
  if (message.photo?.length) {
    return fromFile(message.photo.at(-1)!, `photo-${id}.jpg`, "image/jpeg");
  }
  if (message.audio) return fromFile(message.audio, `audio-${id}.mp3`, "audio/mpeg");
  if (message.voice) return fromFile(message.voice, `voice-${id}.ogg`, "audio/ogg");
  if (message.video) return fromFile(message.video, `video-${id}.mp4`, "video/mp4");
};

// Types and sizes the model can read inline (Claude: images up to 5 MB, PDFs, plain text).
// Anything else still reaches the computer through loadAttachment
const MODEL_READABLE: Record<string, number> = {
  "image/jpeg": 3_750_000,
  "image/png": 3_750_000,
  "image/gif": 3_750_000,
  "image/webp": 3_750_000,
  "application/pdf": MAX_DOWNLOAD_BYTES,
  "text/plain": 1_000_000,
};

// Inbound files become token-free https URLs on a reserved domain: the transcript keeps the URL,
// and download() below turns it back into bytes through the bot API whenever the model reads it
const FILE_URL_PREFIX = "https://telegram.invalid/files/";

const formatSize = (bytes?: number) =>
  bytes === undefined
    ? "size unknown"
    : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const toUserMessage = (message: TelegramMessage): UIMessage => {
  const text = message.text ?? message.caption;
  const attachment = attachmentOf(message);
  const parts: UIMessage["parts"] = [];
  if (attachment) {
    const tooLarge = attachment.size !== undefined && attachment.size > MAX_DOWNLOAD_BYTES;
    parts.push({
      type: "text",
      text: tooLarge
        ? `[Attached file "${attachment.filename}" (${formatSize(attachment.size)}) is over the 20 MB limit and can't be opened. Ask the user for a smaller file or a link.]`
        : `[Attached file "${attachment.filename}" (${attachment.mediaType}, ${formatSize(attachment.size)}), attachment id: ${attachment.fileId}]`,
    });
    const limit = MODEL_READABLE[attachment.mediaType];
    if (!tooLarge && limit !== undefined && (attachment.size ?? Infinity) <= limit) {
      parts.push({
        type: "file",
        url: `${FILE_URL_PREFIX}${encodeURIComponent(attachment.fileId)}`,
        mediaType: attachment.mediaType,
        filename: attachment.filename,
      });
    }
  }
  if (text) {
    parts.push({ type: "text", text });
  }
  return { id: "", role: "user", parts };
};

// One durable session per Clerk user, in their private chat: messages (text and files) become turns,
// replies are posted back
const telegramChannel = chat.channels.custom({
  id: "telegram",
  endpoint: telegramEndpoint,
  key: "telegram-{event.clerkUserId}",
  filter:
    "event.clerkUserId != null && event.message.chat.type == 'private' && (event.message.text != null || event.message.caption != null || event.message.document != null || event.message.photo != null || event.message.audio != null || event.message.voice != null || event.message.video != null)",
  inbound: (update) => ({
    message: toUserMessage(update.message!),
    externalUserId: update.message!.from && String(update.message!.from.id),
    externalMessageId: String(update.message!.message_id),
  }),
  bind: (update) => ({ chatId: update.message!.chat.id, clerkUserId: update.clerkUserId! }),
  download: async (url) => {
    if (!url.href.startsWith(FILE_URL_PREFIX)) return null;
    return { data: await downloadFile(decodeURIComponent(url.href.slice(FILE_URL_PREFIX.length))) };
  },
  surface: (ctx) => {
    const chatId = ctx.handle?.chatId ?? ctx.event!.message!.chat.id;
    const clerkUserId = ctx.handle?.clerkUserId ?? ctx.event!.clerkUserId!;
    return {
      sandboxName: `user-${clerkUserId}`,
      maxSendBytes: MAX_UPLOAD_BYTES,
      loadAttachment: downloadFile,
      sendFile: async (file, caption) => {
        await sendFile(chatId, file, caption);
      },
    } satisfies ComputerSurface;
  },
  outbound: (reply) => (reply.text ? { text: reply.text } : null),
  send: async (message, ctx) => {
    const chatId = ctx.handle?.chatId ?? ctx.event!.message!.chat.id;
    let messageId = 0;
    for (const chunk of splitMessage(message.text)) {
      messageId = await sendMessage(chatId, chunk);
    }
    return { ref: String(messageId) };
  },
  errorMessage: "Sorry, something went wrong. Please try again.",
});

export const telegramAgent = chat.agent({
  id: "telegram-agent",
  channels: [telegramChannel],
  // Turns that work on files run many tool calls, well past the project's 5 minute default
  maxDuration: 30 * 60,
  // The platform's transcript snapshot: a run that boots after the previous one ended
  // loads the conversation from it, so the agent remembers the chat without a database
  storage: defaultStorage,
  tools: { ...webTools, ...computerTools },
  run: async ({ messages, tools, signal, streamText }) =>
    streamText({
      model: chatModel("claude-opus-5-5"),
      // Set per turn so relative requests like "tonight" or "this weekend" resolve correctly
      system: [
        "You are a helpful, concise personal assistant chatting over Telegram.",
        `Today is ${new Date().toUTCString()}.`,
        webToolsInstructions,
        computerToolsInstructions,
      ].join("\n\n"),
      messages,
      tools,
      abortSignal: signal,
      stopWhen: stepCountIs(40),
    }),
});

// Stickers, locations, contacts and the like have no text or file to work with; say so instead of
// silently dropping them
export const telegramUnsupportedMessage = webhook({
  id: "telegram-unsupported-message",
  endpoint: telegramEndpoint,
  filter:
    "event.clerkUserId != null && event.message.chat.type == 'private' && event.message.text == null && event.message.caption == null && event.message.document == null && event.message.photo == null && event.message.audio == null && event.message.voice == null && event.message.video == null",
  onEvent: async ({ event }) => {
    logger.log("Unsupported Telegram message", { updateId: event.update_id });
    await sendMessage(
      event.message!.chat.id,
      "I can read text, photos, documents, audio and video, but not this kind of message."
    );
  },
});
