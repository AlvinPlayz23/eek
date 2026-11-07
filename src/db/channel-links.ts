import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "./index.js";
import { channelIdentifiers, type Platform } from "./schema.js";

export const findChannelLink = (platform: Platform, externalUserId: string) =>
  db.query.channelIdentifiers.findFirst({
    where: and(
      eq(channelIdentifiers.platform, platform),
      eq(channelIdentifiers.externalUserId, externalUserId)
    ),
  });

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
