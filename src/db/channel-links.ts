import { and, eq } from "drizzle-orm";
import { db } from "./index.js";
import { channelIdentifiers, type Platform } from "./schema.js";

export const findChannelLink = (platform: Platform, externalUserId: string) =>
  db.query.channelIdentifiers.findFirst({
    where: and(
      eq(channelIdentifiers.platform, platform),
      eq(channelIdentifiers.externalUserId, externalUserId)
    ),
  });
