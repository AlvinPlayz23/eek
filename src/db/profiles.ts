import { eq } from "drizzle-orm";
import { db } from "./index.js";
import { userProfiles } from "./schema.js";

export const loadProfile = async (clerkUserId: string) => {
  const rows = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.clerkUserId, clerkUserId))
    .limit(1);
  return rows[0] ?? null;
};

export const saveTimezone = async (clerkUserId: string, timezone: string) => {
  await db
    .insert(userProfiles)
    .values({ clerkUserId, timezone })
    .onConflictDoUpdate({
      target: userProfiles.clerkUserId,
      set: { timezone, updatedAt: new Date() },
    });
};
