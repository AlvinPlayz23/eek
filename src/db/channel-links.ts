import { and, asc, eq, isNotNull } from "drizzle-orm";
import { db } from "./index.js";
import { channelIdentifiers, type Platform } from "./schema.js";

export const findChannelLink = (platform: Platform, externalUserId: string) =>
  db.query.channelIdentifiers.findFirst({
    where: and(
      eq(channelIdentifiers.platform, platform),
      eq(channelIdentifiers.externalUserId, externalUserId)
    ),
  });

export const listChannelLinks = async (clerkUserId: string) =>
  db
    .select()
    .from(channelIdentifiers)
    .where(eq(channelIdentifiers.clerkUserId, clerkUserId))
    .orderBy(asc(channelIdentifiers.linkedAt));

export const findUserChannelLink = async (clerkUserId: string, id: string) => {
  const rows = await db
    .select()
    .from(channelIdentifiers)
    .where(and(eq(channelIdentifiers.id, id), eq(channelIdentifiers.clerkUserId, clerkUserId)))
    .limit(1);
  return rows[0] ?? null;
};

// Keeps the chat the assistant can reach this user in, so dashboard-created reminders are
// delivered to the same conversation the user talks to the assistant in
export const touchChannel = async (platform: Platform, externalUserId: string, chatId: string) => {
  await db
    .update(channelIdentifiers)
    .set({ chatId, lastSeenAt: new Date() })
    .where(
      and(
        eq(channelIdentifiers.platform, platform),
        eq(channelIdentifiers.externalUserId, externalUserId)
      )
    );
};

export const unlinkChannel = async (clerkUserId: string, id: string): Promise<boolean> => {
  const rows = await db
    .delete(channelIdentifiers)
    .where(and(eq(channelIdentifiers.id, id), eq(channelIdentifiers.clerkUserId, clerkUserId)))
    .returning({ id: channelIdentifiers.id });
  return rows.length > 0;
};

// Remembers that the user was shown the upgrade prompt, so their first message after subscribing
// can be answered with a welcome
export const markUpgradePrompted = async (platform: Platform, externalUserId: string) => {
  await db
    .update(channelIdentifiers)
    .set({ upgradePromptedAt: new Date() })
    .where(
      and(
        eq(channelIdentifiers.platform, platform),
        eq(channelIdentifiers.externalUserId, externalUserId)
      )
    );
};

// Clears the prompt in one statement and reports whether this call cleared it, so exactly one
// request sends the welcome even when several messages arrive at once
export const claimProWelcome = async (platform: Platform, externalUserId: string) => {
  const rows = await db
    .update(channelIdentifiers)
    .set({ upgradePromptedAt: null })
    .where(
      and(
        eq(channelIdentifiers.platform, platform),
        eq(channelIdentifiers.externalUserId, externalUserId),
        isNotNull(channelIdentifiers.upgradePromptedAt)
      )
    )
    .returning({ id: channelIdentifiers.id });
  return rows.length > 0;
};
