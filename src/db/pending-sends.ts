import { and, desc, eq, gt, lt } from "drizzle-orm";
import { db } from "./index.js";
import { pendingSends, type PendingSend, type Platform } from "./schema.js";

// A pending draft is only good for a short while: after this, the user has to draft it again so a
// forgotten "send it" from twenty minutes ago can't fire
export const PENDING_SEND_TTL_MS = 15 * 60 * 1000;

export type PendingSendInput = {
  draftId: string;
  clerkUserId: string;
  platform: Platform;
  chatId: string;
  toolCallId: string;
  turnId: string;
  recipients: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  threadId: string | null;
};

const chatScope = (input: Pick<PendingSendInput, "clerkUserId" | "platform" | "chatId">) => [
  eq(pendingSends.clerkUserId, input.clerkUserId),
  eq(pendingSends.platform, input.platform),
  eq(pendingSends.chatId, input.chatId),
];

/**
 * Stores the draft waiting for confirmation and returns the rows it replaced. Only the newest draft
 * per chat can be sent by a bare "send it"; callers are expected to delete the superseded Gmail
 * drafts those rows pointed at, so revising a draft doesn't leave litter in the mailbox
 */
export const savePendingSend = async (input: PendingSendInput): Promise<PendingSend[]> => {
  const now = new Date();
  const superseded = await db.delete(pendingSends).where(and(...chatScope(input))).returning();
  await db.insert(pendingSends).values({
    ...input,
    createdAt: now,
    expiresAt: new Date(now.getTime() + PENDING_SEND_TTL_MS),
  });
  return superseded;
};

/** The draft a tool call already created, so a replayed tool step can reuse it */
export const loadPendingSendByToolCallId = async (toolCallId: string): Promise<PendingSend | null> => {
  const rows = await db
    .select()
    .from(pendingSends)
    .where(eq(pendingSends.toolCallId, toolCallId))
    .limit(1);
  return rows[0] ?? null;
};

export const findPendingSend = async (input: {
  clerkUserId: string;
  platform: Platform;
  chatId: string;
  draftId?: string;
  // Cleanup paths (discarding, reporting an expired draft) still need the row after it expires
  includeExpired?: boolean;
}): Promise<PendingSend | null> => {
  const scope = chatScope(input);
  const where = [
    ...scope,
    ...(input.includeExpired ? [] : [gt(pendingSends.expiresAt, new Date())]),
    ...(input.draftId ? [eq(pendingSends.draftId, input.draftId)] : []),
  ];
  const rows = await db
    .select()
    .from(pendingSends)
    .where(and(...where))
    .orderBy(desc(pendingSends.createdAt))
    .limit(1);
  return rows[0] ?? null;
};

export const deletePendingSend = async (draftId: string): Promise<void> => {
  await db.delete(pendingSends).where(eq(pendingSends.draftId, draftId));
};

export const pruneExpiredPendingSends = async (): Promise<void> => {
  await db.delete(pendingSends).where(lt(pendingSends.expiresAt, new Date()));
};
