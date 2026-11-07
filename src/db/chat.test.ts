import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import { db } from "./index.js";
import {
  acquireLock,
  claimPending,
  dropClaimed,
  hasPending,
  insertInbox,
  loadTranscript,
  markProcessed,
  releaseLockIfIdle,
  renewLock,
  saveTranscript,
  strandedConversations,
} from "./chat.js";
import { chatInbox, chatLocks, chatTranscripts } from "./schema.js";
import { sql } from "drizzle-orm";

// Needs a Postgres with the schema pushed (DATABASE_URL); skipped otherwise
describe("chat store", { skip: !process.env.DATABASE_URL }, () => {
  const conversation = { platform: "telegram" as const, clerkUserId: `test-${Date.now()}` };
  const message = (id: string) => ({
    ...conversation,
    externalMessageId: id,
    chatId: "1",
    parts: [{ type: "text" as const, text: id }],
  });

  after(async () => {
    await db.delete(chatInbox).where(sql`clerk_user_id = ${conversation.clerkUserId}`);
    await db.delete(chatLocks).where(sql`clerk_user_id = ${conversation.clerkUserId}`);
    await db.delete(chatTranscripts).where(sql`clerk_user_id = ${conversation.clerkUserId}`);
    await (db as unknown as { $client: { end: () => Promise<void> } }).$client.end();
  });

  test("inbox ignores redelivered messages and returns them in order", async () => {
    await insertInbox(message("m1"));
    await insertInbox(message("m1"));
    await insertInbox(message("m2"));
    const rows = await claimPending(conversation, "run-a");
    assert.deepEqual(rows.map((r) => r.externalMessageId), ["m1", "m2"]);
  });

  test("only one holder owns the lock; the same holder may retry", async () => {
    assert.equal(await acquireLock(conversation, "run-a"), true);
    assert.equal(await acquireLock(conversation, "run-b"), false);
    assert.equal(await acquireLock(conversation, "run-a"), true);
    assert.equal(await renewLock(conversation, "run-b"), false);
    assert.equal(await renewLock(conversation, "run-a"), true);
  });

  test("a lock is not released while messages wait", async () => {
    assert.equal(await releaseLockIfIdle(conversation, "run-a"), false);
    await markProcessed((await claimPending(conversation, "run-a")).map((r) => r.id));
    assert.equal(await releaseLockIfIdle(conversation, "run-b"), false);
    assert.equal(await releaseLockIfIdle(conversation, "run-a"), true);
    assert.equal(await acquireLock(conversation, "run-b"), true);
  });

  test("an expired lease can be taken over", async () => {
    await db.update(chatLocks).set({ leaseUntil: sql`now() - interval '1 second'` }).where(sql`clerk_user_id = ${conversation.clerkUserId}`);
    assert.equal(await acquireLock(conversation, "run-c"), true);
  });

  test("stranded conversations are those with old pending mail and no live lock", async () => {
    await insertInbox(message("m3"));
    await db.update(chatInbox).set({ receivedAt: sql`now() - interval '10 minutes'` }).where(sql`external_message_id = 'm3' and clerk_user_id = ${conversation.clerkUserId}`);
    const live = await strandedConversations(2);
    assert.equal(live.some((c) => c.clerkUserId === conversation.clerkUserId), false);
    await db.update(chatLocks).set({ leaseUntil: sql`now() - interval '1 second'` }).where(sql`clerk_user_id = ${conversation.clerkUserId}`);
    const dead = await strandedConversations(2);
    assert.equal(dead.some((c) => c.clerkUserId === conversation.clerkUserId), true);
  });

  test("a failed run drops only what it claimed, and a new holder can reclaim the rest", async () => {
    await db.delete(chatInbox).where(sql`clerk_user_id = ${conversation.clerkUserId}`);
    await db.delete(chatLocks).where(sql`clerk_user_id = ${conversation.clerkUserId}`);
    assert.equal(await acquireLock(conversation, "run-x"), true);
    await insertInbox(message("n1"));
    assert.deepEqual((await claimPending(conversation, "run-x")).map((r) => r.externalMessageId), ["n1"]);
    // A message that arrives after the claim is not part of this turn
    await insertInbox(message("n2"));
    await dropClaimed(conversation, "run-x");
    assert.equal(await hasPending(conversation), true);
    assert.deepEqual((await claimPending(conversation, "run-x")).map((r) => r.externalMessageId), ["n2"]);

    // run-x dies holding n2; once its lease is gone another run takes over and claims it again
    await db.update(chatLocks).set({ leaseUntil: sql`now() - interval '1 second'` }).where(sql`clerk_user_id = ${conversation.clerkUserId}`);
    assert.equal(await acquireLock(conversation, "run-y"), true);
    assert.deepEqual((await claimPending(conversation, "run-y")).map((r) => r.externalMessageId), ["n2"]);
  });

  test("transcripts upsert", async () => {
    assert.deepEqual(await loadTranscript(conversation), []);
    await saveTranscript(conversation, [{ role: "user", content: "a" }]);
    await saveTranscript(conversation, [{ role: "user", content: "b" }]);
    assert.deepEqual(await loadTranscript(conversation), [{ role: "user", content: "b" }]);
  });
});
