import { eq } from "drizzle-orm";
import { db } from "./index.js";
import { gmailConnections, type GmailConnection } from "./schema.js";

export const loadGmailConnection = async (clerkUserId: string): Promise<GmailConnection | null> => {
  const rows = await db
    .select()
    .from(gmailConnections)
    .where(eq(gmailConnections.clerkUserId, clerkUserId))
    .limit(1);
  return rows[0] ?? null;
};

export const saveGmailConnection = async (input: {
  clerkUserId: string;
  composioAccountId: string;
  email?: string | null;
  status?: string | null;
}) => {
  const now = new Date();
  await db
    .insert(gmailConnections)
    .values({
      clerkUserId: input.clerkUserId,
      composioAccountId: input.composioAccountId,
      email: input.email ?? null,
      status: input.status ?? null,
      connectedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: gmailConnections.clerkUserId,
      set: {
        composioAccountId: input.composioAccountId,
        email: input.email ?? null,
        status: input.status ?? null,
        updatedAt: now,
      },
    });
};

export const deleteGmailConnection = async (clerkUserId: string) => {
  await db.delete(gmailConnections).where(eq(gmailConnections.clerkUserId, clerkUserId));
};
