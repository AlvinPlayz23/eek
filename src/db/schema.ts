import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

// Links a user's identity on a chat platform to their Clerk user, so inbound messages
// can be scoped to (and rejected for anyone but) a linked account
export const channelIdentifiers = pgTable(
  "channel_identifiers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    platform: text("platform", { enum: ["telegram"] }).notNull(),
    // The platform's own user id, e.g. Telegram's `from.id`
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
