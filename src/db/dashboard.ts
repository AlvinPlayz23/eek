import { eq } from "drizzle-orm";
import { db } from "./index.js";
import {
  channelIdentifiers,
  chatInbox,
  chatLocks,
  chatTranscripts,
  reminders,
  userProfiles,
} from "./schema.js";

// Removes everything the assistant knows about a user. The dashboard asks for an explicit
// confirmation before calling this; afterwards the user is unlinked and has to sign in again
export const deleteUserData = async (clerkUserId: string) => {
  await db.delete(reminders).where(eq(reminders.clerkUserId, clerkUserId));
  await db.delete(chatInbox).where(eq(chatInbox.clerkUserId, clerkUserId));
  await db.delete(chatLocks).where(eq(chatLocks.clerkUserId, clerkUserId));
  await db.delete(chatTranscripts).where(eq(chatTranscripts.clerkUserId, clerkUserId));
  await db.delete(channelIdentifiers).where(eq(channelIdentifiers.clerkUserId, clerkUserId));
  await db.delete(userProfiles).where(eq(userProfiles.clerkUserId, clerkUserId));
};
