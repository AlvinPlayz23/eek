import type { Platform } from "../db/schema.js";
import { log } from "../log.js";
import { splitMessage } from "./channel-messages.js";
import * as linq from "./linq-api.js";
import * as telegram from "./telegram-api.js";

export type OutgoingFile = { data: Uint8Array; filename: string; mediaType: string };

// What the agent needs from a chat platform. Chat ids travel as strings so every platform fits the
// same event and table columns. Adding a platform to PLATFORMS makes CHANNELS fail to compile until
// it has an entry
export type Channel = {
  // How the platform is named to the model, e.g. "Telegram" or "iMessage"
  platformName: string;
  maxSendBytes: number;
  sendText: (chatId: string, text: string) => Promise<void>;
  sendFile: (chatId: string, file: OutgoingFile, caption?: string) => Promise<void>;
  downloadAttachment: (attachmentId: string) => Promise<Uint8Array>;
  // The assistant started or finished working on a turn: read receipt and typing bubble
  setWorking: (chatId: string, working: boolean) => Promise<void>;
};

// Telegram rejects messages over 4096 characters
const TELEGRAM_MAX_LENGTH = 4096;
// iMessage has no practical length cap, but a wall of text is hard to read on a phone, so very long
// replies go out as several bubbles
const LINQ_MAX_LENGTH = 4000;

export const CHANNELS: Record<Platform, Channel> = {
  telegram: {
    platformName: "Telegram",
    maxSendBytes: telegram.MAX_UPLOAD_BYTES,
    sendText: async (chatId, text) => {
      for (const chunk of splitMessage(text, TELEGRAM_MAX_LENGTH)) {
        await telegram.sendMessage(Number(chatId), chunk);
      }
    },
    sendFile: async (chatId, file, caption) => {
      await telegram.sendFile(Number(chatId), file, caption);
    },
    downloadAttachment: telegram.downloadFile,
    setWorking: async () => {},
  },
  linq: {
    platformName: "iMessage",
    maxSendBytes: linq.MAX_UPLOAD_BYTES,
    sendText: async (chatId, text) => {
      try {
        for (const chunk of splitMessage(text, LINQ_MAX_LENGTH)) {
          await linq.sendMessage(chatId, chunk);
        }
      } catch (error) {
        // The user texted STOP mid-turn: Linq blocks every send until they write again. Retrying,
        // or sending from another line, would break that, so the reply is dropped
        if (!linq.isOptedOutError(error)) throw error;
        log.warn("Reply dropped: recipient opted out", { "channel.platform": "linq" });
      }
    },
    sendFile: async (chatId, file, caption) => {
      await linq.sendFile(chatId, file, caption);
    },
    downloadAttachment: linq.downloadAttachment,
    setWorking: async (chatId, working) => {
      try {
        if (working) await Promise.all([linq.markRead(chatId), linq.startTyping(chatId)]);
        else await linq.stopTyping(chatId);
      } catch (error) {
        // Cosmetic: a failed typing bubble must not fail the turn
        log.warn("Typing indicator failed", {
          "channel.platform": "linq",
          "error.name": error instanceof Error ? error.name : "unknown",
        });
      }
    },
  },
};

// Plain-text sends for flows outside a turn, such as account linking
export const sendChannelText = (platform: Platform, chatId: string, text: string) =>
  CHANNELS[platform].sendText(chatId, text);
