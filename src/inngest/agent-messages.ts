import type { ModelMessage, ToolModelMessage } from "ai";
import type { ChatInboxRow, InboxPart, Platform } from "../db/schema.js";
import type { Channel } from "./channels.js";
import { channelFileUrls } from "./channel-messages.js";
import type { ToolOutput } from "./computer-tools.js";
import { log } from "../log.js";

// Helpers for the message list a turn builds: what the model is shown, and what is stored for the
// next turn. Everything here is plain data in, plain data out

export const IMAGE_NOTE =
  "[No longer shown. Take a new screenshot or view the file again if you need it.]";

export type ToolResultPart = Extract<ToolModelMessage["content"][number], { type: "tool-result" }>;

const textOnly = (output: ToolOutput): ToolOutput =>
  output.type !== "content"
    ? output
    : {
        type: "text",
        value: [
          ...output.value.flatMap((item) => (item.type === "text" ? [item.text] : [])),
          IMAGE_NOTE,
        ].join("\n"),
      };

const hasMedia = (output: ToolOutput) =>
  output.type === "content" && output.value.some((item) => item.type !== "text");

const mapToolOutputs = (
  message: ModelMessage,
  fn: (part: ToolResultPart) => ToolResultPart
): ModelMessage =>
  message.role !== "tool"
    ? message
    : { ...message, content: message.content.map((part) => (part.type === "tool-result" ? fn(part) : part)) };

// Screenshots and viewed files are large, and only the newest ones help the model: older ones
// become a short note
export const dropOldImages = (messages: ModelMessage[], keep: number): ModelMessage[] => {
  let seen = 0;
  const result = [...messages];
  for (let i = result.length - 1; i >= 0; i--) {
    result[i] = mapToolOutputs(result[i]!, (part) => {
      if (!hasMedia(part.output)) return part;
      return ++seen <= keep ? part : { ...part, output: textOnly(part.output) };
    });
  }
  return result;
};

// What survives into the next turn: no files (the attachment note in the text still lets the model
// load them) and no images in tool results
export const stripForStorage = (messages: ModelMessage[]): ModelMessage[] =>
  messages.map((message) => {
    if (message.role === "tool") {
      return mapToolOutputs(message, (part) => ({ ...part, output: textOnly(part.output) }));
    }
    if (message.role !== "user" || typeof message.content === "string") return message;
    const content = message.content.filter((part) => part.type === "text");
    return {
      ...message,
      content: content.length > 0 ? content : [{ type: "text" as const, text: "[attachment]" }],
    };
  });

// The conversation is kept to a window that starts at a user message, so it never opens with a
// tool result whose call was cut off
export const windowMessages = (
  messages: ModelMessage[],
  { maxMessages = 80, maxChars = 250_000 } = {}
): ModelMessage[] => {
  const nextUser = (from: number) => {
    let start = from;
    while (start < messages.length && messages[start]!.role !== "user") start++;
    return start;
  };
  let start = nextUser(Math.max(0, messages.length - maxMessages));
  while (start < messages.length - 1 && JSON.stringify(messages.slice(start)).length > maxChars) {
    start = nextUser(start + 1);
  }
  return messages.slice(start);
};

type ToolCallLike = { toolCallId: string; toolName: string; input: unknown };

// Tool calls the model made that nothing has answered yet. Calls the SDK itself rejected (input
// that doesn't match the schema) already come with an error result and are skipped
export const pendingToolCalls = (responseMessages: ModelMessage[]): ToolCallLike[] => {
  const answered = new Set<string>();
  const calls: ToolCallLike[] = [];
  for (const message of responseMessages) {
    if (message.role === "tool") {
      for (const part of message.content) {
        if (part.type === "tool-result") answered.add(part.toolCallId);
      }
    } else if (message.role === "assistant" && typeof message.content !== "string") {
      for (const part of message.content) {
        if (part.type === "tool-call" && !part.providerExecuted) calls.push(part);
      }
    }
  }
  return calls.filter((call) => !answered.has(call.toolCallId));
};

// One user message from everything that arrived while the assistant was busy
export const userMessageFrom = (rows: Pick<ChatInboxRow, "parts">[]): ModelMessage => ({
  role: "user",
  content: rows.flatMap((row) => row.parts.map(toContentPart)),
});

const toContentPart = (part: InboxPart) =>
  part.type === "text"
    ? { type: "text" as const, text: part.text }
    : {
        type: "file" as const,
        data: part.data,
        mediaType: part.mediaType,
        ...(part.filename ? { filename: part.filename } : {}),
      };

// Inbound files are reserved URLs that mean nothing to the model: fetch the bytes through the
// platform now. A file that can't be fetched becomes a note, so one bad attachment doesn't sink
// the turn
export const resolveFiles = async (
  messages: ModelMessage[],
  platform: Platform,
  channel: Channel
): Promise<ModelMessage[]> => {
  const { fromUrl } = channelFileUrls(platform);
  return Promise.all(
    messages.map(async (message) => {
      if (message.role !== "user" || typeof message.content === "string") return message;
      const content = await Promise.all(
        message.content.map(async (part) => {
          if (part.type !== "file" || typeof part.data !== "string") return part;
          const url = URL.canParse(part.data) ? new URL(part.data) : null;
          const attachmentId = url && fromUrl(url);
          if (!attachmentId) return part;
          try {
            return { ...part, data: await channel.downloadAttachment(attachmentId) };
          } catch (error) {
            log.warn("Attachment could not be loaded", {
              "channel.platform": platform,
              "error.name": error instanceof Error ? error.name : "unknown",
            });
            return {
              type: "text" as const,
              text: `[The attachment "${part.filename ?? "file"}" could not be loaded right now.]`,
            };
          }
        })
      );
      return { ...message, content };
    })
  );
};
