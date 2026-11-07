import assert from "node:assert/strict";
import { after, beforeEach, describe, mock, test } from "node:test";
import { sql } from "drizzle-orm";

// Real Postgres for the inbox and links; Inngest and Clerk billing are replaced
const sent: { name: string; data: Record<string, unknown>; id?: string }[] = [];
let sendFails = false;
let pro = true;
mock.module("./inngest/client.js", {
  exports: {
    inngest: {
      send: async (payload: { name: string; data: Record<string, unknown>; id?: string }) => {
        if (sendFails) throw new Error("inngest down");
        sent.push(payload);
      },
    },
  },
});
mock.module("./billing.js", {
  exports: { hasProPlan: async () => pro, upgradeUrl: () => "https://upgrade.example" },
});

process.env.TELEGRAM_WEBHOOK_SECRET = "s3cret";
const { db } = await import("./db/index.js");
const { channelIdentifiers, chatInbox } = await import("./db/schema.js");
const { telegramWebhook } = await import("./telegram-webhook.js");

const userId = `tg-${Date.now()}`;
const post = (body: unknown, secret = "s3cret") =>
  telegramWebhook.request("/", {
    method: "POST",
    headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": secret },
    body: JSON.stringify(body),
  });
const update = (extra: Record<string, unknown>, messageId = 7) => ({
  update_id: 1,
  message: { message_id: messageId, chat: { id: 4242, type: "private" }, from: { id: Number(userId.slice(3)) % 1e9 }, ...extra },
});
const externalUserId = String(Number(userId.slice(3)) % 1e9);

describe("telegram webhook", { skip: !process.env.DATABASE_URL }, () => {
  beforeEach(() => {
    sent.length = 0;
    sendFails = false;
    pro = true;
  });
  after(async () => {
    await db.delete(chatInbox).where(sql`clerk_user_id = 'clerk-tg-test'`);
    await db.delete(channelIdentifiers).where(sql`external_user_id = ${externalUserId}`);
    await (db as unknown as { $client: { end: () => Promise<void> } }).$client.end();
  });

  test("rejects a wrong secret", async () => {
    assert.equal((await post(update({ text: "hi" }), "nope")).status, 401);
  });

  test("an unlinked user starts account linking and nothing is queued", async () => {
    const res = await post(update({ text: "hi" }));
    assert.equal(res.status, 200);
    assert.equal(sent.length, 1);
    assert.equal(sent[0]!.name, "chat/account.link.requested");
    assert.deepEqual(sent[0]!.data, { platform: "telegram", externalUserId, chatId: "4242" });
  });

  describe("linked", () => {
    test("link", async () => {
      await db.insert(channelIdentifiers).values({ platform: "telegram", externalUserId, clerkUserId: "clerk-tg-test" });
    });

    test("a message is stored in the inbox, then announced with a dedupe id", async () => {
      const res = await post(update({ text: "hello" }));
      assert.equal(res.status, 200);
      assert.equal(sent[0]!.name, "chat/message.received");
      assert.equal(sent[0]!.id, "telegram-4242:7");
      const rows = await db.select().from(chatInbox).where(sql`clerk_user_id = 'clerk-tg-test'`);
      assert.equal(rows.length, 1);
      assert.deepEqual(rows[0]!.parts, [{ type: "text", text: "hello" }]);
    });

    test("a failed announcement answers 502 and the redelivery does not duplicate the row", async () => {
      sendFails = true;
      assert.equal((await post(update({ text: "again" }, 8))).status, 502);
      sendFails = false;
      assert.equal((await post(update({ text: "again" }, 8))).status, 200);
      const rows = await db.select().from(chatInbox).where(sql`external_message_id = '4242:8'`);
      assert.equal(rows.length, 1);
      assert.equal(sent.length, 1);
    });

    test("a sticker gets the unsupported reply in the response", async () => {
      const res = await post(update({ sticker: { file_id: "x" } }, 9));
      assert.equal(res.status, 200);
      const body = (await res.json()) as { method: string; chat_id: number; text: string };
      assert.equal(body.method, "sendMessage");
      assert.equal(body.chat_id, 4242);
      assert.equal(sent.length, 0);
    });

    test("without the Pro plan the upgrade message is returned and nothing is queued", async () => {
      pro = false;
      const body = (await (await post(update({ text: "hello" }, 10))).json()) as { text: string };
      assert.match(body.text, /Pro plan/);
      assert.equal(sent.length, 0);
    });

    test("a photo is queued with a file part and an attachment note", async () => {
      const res = await post(update({ photo: [{ file_id: "small", width: 1, height: 1 }, { file_id: "big", width: 9, height: 9, file_size: 1000 }], caption: "look" }, 11));
      assert.equal(res.status, 200);
      const [row] = await db.select().from(chatInbox).where(sql`external_message_id = '4242:11'`);
      const parts = row!.parts as { type: string; data?: string; text?: string }[];
      assert.match(parts[0]!.text!, /attachment id: big/);
      assert.equal(parts[1]!.type, "file");
      assert.equal(parts[1]!.data, "https://telegram.invalid/files/big");
      assert.equal(parts[2]!.text, "look");
    });
  });
});
