import type { ModelMessage } from "ai";
import {
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Every chat platform the assistant is reachable on. `linq` is iMessage through Linq
export const PLATFORMS = ["telegram", "linq"] as const;
export type Platform = (typeof PLATFORMS)[number];

// Links a user's identity on a chat platform to their Clerk user, so inbound messages
// can be scoped to (and rejected for anyone but) a linked account
export const channelIdentifiers = pgTable(
  "channel_identifiers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    platform: text("platform", { enum: PLATFORMS }).notNull(),
    // The platform's own user id: Telegram's `from.id`, or the iMessage sender handle (an E.164
    // phone number or an Apple ID email) for Linq
    externalUserId: text("external_user_id").notNull(),
    clerkUserId: text("clerk_user_id").notNull(),
    linkedAt: timestamp("linked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("channel_identifiers_platform_external_user_id_idx").on(
      table.platform,
      table.externalUserId
    ),
  ]
);

export type ChannelIdentifier = typeof channelIdentifiers.$inferSelect;
export type NewChannelIdentifier = typeof channelIdentifiers.$inferInsert;


// Parts of a user message as the model reads it: text, and files as platform-reserved URLs that
// are resolved to bytes when the model is called (see channel-messages.ts)
export type InboxPart =
  | { type: "text"; text: string }
  | { type: "file"; data: string; mediaType: string; filename?: string };

// Messages the channel gate let through, waiting for the agent. The webhook inserts a row before it
// answers the platform, so a message is never lost between the webhook and the turn that reads it.
// The unique index makes platform redeliveries no-ops
export const chatInbox = pgTable(
  "chat_inbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    platform: text("platform", { enum: PLATFORMS }).notNull(),
    externalMessageId: text("external_message_id").notNull(),
    clerkUserId: text("clerk_user_id").notNull(),
    // Where replies go: a Telegram chat id or a Linq chat id, as a string
    chatId: text("chat_id").notNull(),
    parts: jsonb("parts").$type<InboxPart[]>().notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    // The run that is answering this message. A run that fails clears only what it claimed, so
    // messages that arrived meanwhile still get an answer
    claimedBy: text("claimed_by"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("chat_inbox_platform_external_message_id_idx").on(
      table.platform,
      table.externalMessageId
    ),
    index("chat_inbox_pending_idx").on(table.platform, table.clerkUserId, table.processedAt),
  ]
);

// The conversation the model remembers, one per user and platform. Images are stripped before it is
// stored, so it stays text and tool results
export const chatTranscripts = pgTable(
  "chat_transcripts",
  {
    platform: text("platform", { enum: PLATFORMS }).notNull(),
    clerkUserId: text("clerk_user_id").notNull(),
    messages: jsonb("messages").$type<ModelMessage[]>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.platform, table.clerkUserId] })]
);

// One agent turn at a time per user and platform. A lease, so a run that dies can't block the
// conversation for longer than the lease
export const chatLocks = pgTable(
  "chat_locks",
  {
    platform: text("platform", { enum: PLATFORMS }).notNull(),
    clerkUserId: text("clerk_user_id").notNull(),
    holder: text("holder").notNull(),
    leaseUntil: timestamp("lease_until", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.platform, table.clerkUserId] })]
);

export type ChatInboxRow = typeof chatInbox.$inferSelect;
