import { and, eq } from "drizzle-orm";
import { db } from "./index.js";
import { channelIdentifiers } from "./schema.js";

export const findTelegramLink = (telegramUserId: string) =>
  db.query.channelIdentifiers.findFirst({
    where: and(
      eq(channelIdentifiers.platform, "telegram"),
      eq(channelIdentifiers.externalUserId, telegramUserId)
    ),
  });

// One account-linking run per unlinked Telegram user at a time, so repeated messages while a code
// is still valid don't each start a new flow
export const linkIdempotencyKey = (telegramUserId: string) => `telegram-link-${telegramUserId}`;
