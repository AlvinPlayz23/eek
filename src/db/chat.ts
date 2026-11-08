import { and, asc, desc, eq, inArray, isNotNull, isNull, lt, ne, notExists, or, sql } from "drizzle-orm";
import type { ModelMessage } from "ai";
import { db } from "./index.js";
import {
  chatInbox,
  chatLocks,
  chatTranscripts,
  chatWorkingMessages,
  type ChatInboxRow,
  type InboxPart,
  type Platform,
} from "./schema.js";

type Conversation = { platform: Platform; clerkUserId: string };

// True when the message was new. A redelivery keeps the original row, so callers can tell the two
// apart (the webhook only shows a working message for a message it actually queued)
export const insertInbox = async (row: {
  platform: Platform;
  externalMessageId: string;
  clerkUserId: string;
  chatId: string;
  parts: InboxPart[];
}) => {
  const inserted = await db
    .insert(chatInbox)
    .values(row)
    .onConflictDoNothing()
    .returning({ id: chatInbox.id });
  return inserted.length > 0;
};

const pending = ({ platform, clerkUserId }: Conversation) =>
  and(
    eq(chatInbox.platform, platform),
    eq(chatInbox.clerkUserId, clerkUserId),
    isNull(chatInbox.processedAt)
  );

// Takes the messages this holder is going to answer: everything unprocessed that no other run
// claimed. The holder owns the conversation's lock, so nothing else claims at the same time
export const claimPending = async (
  conversation: Conversation,
  holder: string
): Promise<ChatInboxRow[]> => {
  const rows = await db
    .select()
    .from(chatInbox)
    .where(and(pending(conversation), or(isNull(chatInbox.claimedBy), eq(chatInbox.claimedBy, holder))))
    .orderBy(asc(chatInbox.receivedAt), asc(chatInbox.id))
    .limit(20);
  if (rows.length > 0) {
    await db
      .update(chatInbox)
      .set({ claimedBy: holder })
      .where(inArray(chatInbox.id, rows.map((row) => row.id)));
  }
  return rows;
};

export const markProcessed = async (ids: string[]) => {
  if (ids.length === 0) return;
  await db.update(chatInbox).set({ processedAt: new Date() }).where(inArray(chatInbox.id, ids));
};

// After a turn failed for good: the user was told to try again, so what it claimed is done with.
// Messages that arrived after the claim stay queued
export const dropClaimed = async (conversation: Conversation, holder: string) => {
  await db
    .update(chatInbox)
    .set({ processedAt: new Date() })
    .where(and(pending(conversation), eq(chatInbox.claimedBy, holder)));
};

export const hasPending = async (conversation: Conversation) => {
  const rows = await db.select({ id: chatInbox.id }).from(chatInbox).where(pending(conversation)).limit(1);
  return rows.length > 0;
};

// Every step of a turn renews the lease, so it only has to outlast the longest single step. A run
// that dies leaves the conversation blocked for at most this long
const LEASE_SECONDS = 15 * 60;
const leaseUntil = () => sql`now() + ${LEASE_SECONDS} * interval '1 second'`;

// True when this holder now owns the conversation: nobody held it, the previous lease ran out, or
// this holder already owned it (a retried step)
export const acquireLock = async (conversation: Conversation, holder: string) => {
  const rows = await db
    .insert(chatLocks)
    .values({ ...conversation, holder, leaseUntil: leaseUntil() })
    .onConflictDoUpdate({
      target: [chatLocks.platform, chatLocks.clerkUserId],
      set: { holder, leaseUntil: leaseUntil() },
      setWhere: or(lt(chatLocks.leaseUntil, sql`now()`), eq(chatLocks.holder, holder)),
    })
    .returning({ holder: chatLocks.holder });
  if (rows.length === 0) return false;
  // Whatever an earlier holder had claimed is up for grabs again: it no longer owns the lock
  await db
    .update(chatInbox)
    .set({ claimedBy: null })
    .where(and(pending(conversation), isNotNull(chatInbox.claimedBy), ne(chatInbox.claimedBy, holder)));
  return true;
};

export const renewLock = async (conversation: Conversation, holder: string) => {
  const rows = await db
    .update(chatLocks)
    .set({ leaseUntil: leaseUntil() })
    .where(
      and(
        eq(chatLocks.platform, conversation.platform),
        eq(chatLocks.clerkUserId, conversation.clerkUserId),
        eq(chatLocks.holder, holder)
      )
    )
    .returning({ holder: chatLocks.holder });
  return rows.length > 0;
};

// Releases only when nothing is waiting, in one statement: a message that lands after the check
// starts its own run, which waits for this delete on the lock row and then takes the lock
export const releaseLockIfIdle = async (conversation: Conversation, holder: string) => {
  const rows = await db
    .delete(chatLocks)
    .where(
      and(
        eq(chatLocks.platform, conversation.platform),
        eq(chatLocks.clerkUserId, conversation.clerkUserId),
        eq(chatLocks.holder, holder),
        notExists(db.select({ one: sql`1` }).from(chatInbox).where(pending(conversation)))
      )
    )
    .returning({ holder: chatLocks.holder });
  return rows.length > 0;
};

export const releaseLock = async (conversation: Conversation, holder: string) => {
  await db
    .delete(chatLocks)
    .where(
      and(
        eq(chatLocks.platform, conversation.platform),
        eq(chatLocks.clerkUserId, conversation.clerkUserId),
        eq(chatLocks.holder, holder)
      )
    );
};

export const loadTranscript = async (conversation: Conversation): Promise<ModelMessage[]> => {
  const row = await db.query.chatTranscripts.findFirst({
    where: and(
      eq(chatTranscripts.platform, conversation.platform),
      eq(chatTranscripts.clerkUserId, conversation.clerkUserId)
    ),
  });
  return row?.messages ?? [];
};

export const saveTranscript = async (conversation: Conversation, messages: ModelMessage[]) => {
  await db
    .insert(chatTranscripts)
    .values({ ...conversation, messages })
    .onConflictDoUpdate({
      target: [chatTranscripts.platform, chatTranscripts.clerkUserId],
      set: { messages, updatedAt: new Date() },
    });
};

// Conversations with messages nobody is working on: the run that should have handled them died, or
// its wake-up event was lost. The sweeper starts a run for each
export const strandedConversations = async (olderThanMinutes: number) => {
  const rows = await db
    .selectDistinct({
      platform: chatInbox.platform,
      clerkUserId: chatInbox.clerkUserId,
      chatId: chatInbox.chatId,
    })
    .from(chatInbox)
    .leftJoin(
      chatLocks,
      and(
        eq(chatLocks.platform, chatInbox.platform),
        eq(chatLocks.clerkUserId, chatInbox.clerkUserId)
      )
    )
    .where(
      and(
        isNull(chatInbox.processedAt),
        lt(chatInbox.receivedAt, sql`now() - ${olderThanMinutes} * interval '1 minute'`),
        or(isNull(chatLocks.holder), lt(chatLocks.leaseUntil, sql`now()`))
      )
    );
  return rows;
};

// The latest messages the assistant has answered, for the dashboard's activity feed
export const listRecentInbox = async (clerkUserId: string, limit = 5) =>
  db
    .select({
      id: chatInbox.id,
      platform: chatInbox.platform,
      parts: chatInbox.parts,
      receivedAt: chatInbox.receivedAt,
    })
    .from(chatInbox)
    .where(and(eq(chatInbox.clerkUserId, clerkUserId), isNotNull(chatInbox.processedAt)))
    .orderBy(desc(chatInbox.receivedAt))
    .limit(limit);

// Where a linked account last talked to the assistant. Used to backfill `chat_id` for links that
// predate the column, so dashboard-created reminders know where to go
export const latestChatId = async (clerkUserId: string, platform: Platform) => {
  const rows = await db
    .select({ chatId: chatInbox.chatId })
    .from(chatInbox)
    .where(and(eq(chatInbox.clerkUserId, clerkUserId), eq(chatInbox.platform, platform)))
    .orderBy(desc(chatInbox.receivedAt))
    .limit(1);
  return rows[0]?.chatId ?? null;
};

// Processed messages are only kept for dedupe of late redeliveries
export const deleteOldProcessed = async (olderThanHours: number) => {
  await db
    .delete(chatInbox)
    .where(
      lt(chatInbox.processedAt, sql`now() - ${olderThanHours} * interval '1 hour'`)
    );
};

// The message shown while the agent works. The row is what lets the webhook, the turn and the
// failure handler delete the same message exactly once, however often their steps are replayed
export const findWorkingMessage = async (platform: Platform, chatId: string) => {
  const row = await db.query.chatWorkingMessages.findFirst({
    where: and(
      eq(chatWorkingMessages.platform, platform),
      eq(chatWorkingMessages.chatId, chatId)
    ),
  });
  return row?.messageId;
};

// False when another caller recorded one first: the message just sent is a duplicate
export const saveWorkingMessage = async ({
  platform,
  chatId,
  messageId,
}: {
  platform: Platform;
  chatId: string;
  messageId: string;
}) => {
  const rows = await db
    .insert(chatWorkingMessages)
    .values({ platform, chatId, messageId })
    .onConflictDoNothing()
    .returning({ messageId: chatWorkingMessages.messageId });
  return rows.length > 0;
};

// Takes the row so only one caller deletes the message
export const takeWorkingMessage = async (platform: Platform, chatId: string) => {
  const rows = await db
    .delete(chatWorkingMessages)
    .where(
      and(
        eq(chatWorkingMessages.platform, platform),
        eq(chatWorkingMessages.chatId, chatId)
      )
    )
    .returning({ messageId: chatWorkingMessages.messageId });
  return rows[0]?.messageId;
};
