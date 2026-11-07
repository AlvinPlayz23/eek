import type { MessageReceivedWebhookEvent } from "@linqapp/sdk/resources/webhooks";
import type { InboxPart } from "../db/schema.js";
import { toInboxParts, type InboundAttachment } from "./channel-messages.js";
import { messageText, MAX_DOWNLOAD_BYTES as LINQ_MAX_DOWNLOAD_BYTES } from "./linq-api.js";
import { MAX_DOWNLOAD_BYTES as TELEGRAM_MAX_DOWNLOAD_BYTES } from "./telegram-api.js";

// What a platform's webhook payload turns into: a message for the agent, one it can't read, or
// something to ignore. `externalMessageId` is unique per platform and dedupes redeliveries
export type Inbound =
  | { kind: "message"; externalMessageId: string; chatId: string; parts: InboxPart[] }
  | { kind: "unsupported" }
  | { kind: "ignore" };

type TelegramFile = {
  file_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
};

export type TelegramMessage = {
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

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

// A Telegram message carries at most one file; albums arrive as one message per item
const attachmentOf = (message: TelegramMessage): InboundAttachment | undefined => {
  const id = message.message_id;
  const fromFile = (file: TelegramFile, fallbackName: string, fallbackType: string) => ({
    id: file.file_id,
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

export const parseTelegramMessage = (message: TelegramMessage): Inbound => {
  if (message.chat.type !== "private") return { kind: "ignore" };
  const attachment = attachmentOf(message);
  const text = message.text ?? message.caption;
  // Stickers, locations, contacts and the like have no text or file to work with
  if (text === undefined && !attachment) return { kind: "unsupported" };
  return {
    kind: "message",
    // Message ids are only unique within a chat
    externalMessageId: `${message.chat.id}:${message.message_id}`,
    chatId: String(message.chat.id),
    parts: toInboxParts({
      platform: "telegram",
      text,
      attachments: attachment ? [attachment] : [],
      maxDownloadBytes: TELEGRAM_MAX_DOWNLOAD_BYTES,
    }),
  };
};

export const parseLinqMessage = (data: MessageReceivedWebhookEvent["data"]): Inbound => {
  if (data.direction !== "inbound" || data.chat.is_group) return { kind: "ignore" };
  const types = new Set(data.parts.map((part) => part.type));
  const readable = types.has("text") || types.has("link") || types.has("media");
  if (!readable) {
    // iMessage app cards and App Clips arrive as the message's only part
    const onlyUnreadable = data.parts.every(
      (part) => part.type === "imessage_app" || part.type === "app_clip"
    );
    return { kind: onlyUnreadable ? "unsupported" : "ignore" };
  }
  // An iMessage can carry several files in one bubble
  const attachments = data.parts.flatMap((part) =>
    part.type === "media"
      ? [{ id: part.id, filename: part.filename, mediaType: part.mime_type, size: part.size_bytes }]
      : []
  );
  return {
    kind: "message",
    externalMessageId: data.id,
    chatId: data.chat.id,
    parts: toInboxParts({
      platform: "linq",
      text: messageText(data.parts) || undefined,
      attachments,
      maxDownloadBytes: LINQ_MAX_DOWNLOAD_BYTES,
    }),
  };
};
