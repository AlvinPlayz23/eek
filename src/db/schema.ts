import type { ModelMessage } from "ai";
import {
  index,
  integer,
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

export const REMINDER_STATUSES = ["pending", "paused", "sent", "canceled", "failed"] as const;
export type ReminderStatus = (typeof REMINDER_STATUSES)[number];

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
    // Where the assistant can reach this user on the platform, so the dashboard can show reminders
    // to the same conversation. Updated whenever a gated message arrives
    chatId: text("chat_id"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    linkedAt: timestamp("linked_at", { withTimezone: true }).notNull().defaultNow(),
    // When the user was last told to upgrade. Cleared once they are on Pro, which is when the
    // one-time welcome is sent (see channel-gate.ts)
    upgradePromptedAt: timestamp("upgrade_prompted_at", { withTimezone: true }),
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

// Preferences that follow the user across chat platforms. The timezone is what reminders are
// scheduled in; it is null until the agent asks for it
export const userProfiles = pgTable("user_profiles", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  timezone: text("timezone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserProfile = typeof userProfiles.$inferSelect;

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

// The "working…" message a platform can show while the agent runs. Telegram deletes it before the
// reply; platforms that can't unsend messages use their own native indicator instead. One per chat
export const chatWorkingMessages = pgTable(
  "chat_working_messages",
  {
    platform: text("platform", { enum: PLATFORMS }).notNull(),
    chatId: text("chat_id").notNull(),
    messageId: text("message_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.platform, table.chatId] })]
);

// One row is one reminder, or one recurring series. `dueAt` is the next occurrence; delivery
// advances it for recurring reminders instead of inserting a row per occurrence. `timezone` is
// captured at creation so changing the profile does not move an existing schedule
export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull(),
    platform: text("platform", { enum: PLATFORMS }).notNull(),
    chatId: text("chat_id").notNull(),
    // The tool call that created this row. A retried chat-turn step reuses the row and the
    // idempotent reminder event instead of creating a duplicate
    dedupeKey: text("dedupe_key"),
    text: text("text").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    // An RFC 5545 rule with its DTSTART; null for a one-shot
    rrule: text("rrule"),
    timezone: text("timezone").notNull(),
    status: text("status", { enum: REMINDER_STATUSES }).notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    // A short lease so an interrupted delivery is retried, but not by two runs at once
    claimedUntil: timestamp("claimed_until", { withTimezone: true }),
    lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("reminders_dedupe_key_idx").on(table.dedupeKey),
    index("reminders_due_idx").on(table.status, table.dueAt),
    index("reminders_user_idx").on(table.clerkUserId, table.status, table.dueAt),
  ]
);

export type Reminder = typeof reminders.$inferSelect;
export type NewReminder = typeof reminders.$inferInsert;

export type ChatInboxRow = typeof chatInbox.$inferSelect;

// One row per user with a connected Gmail account via Composio (managed OAuth).
// Stores only the Composio connected-account id; Composio holds and refreshes tokens
export const gmailConnections = pgTable("gmail_connections", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  composioAccountId: text("composio_account_id").notNull(),
  email: text("email"),
  status: text("status"),
  connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GmailConnection = typeof gmailConnections.$inferSelect;
export type NewGmailConnection = typeof gmailConnections.$inferInsert;
