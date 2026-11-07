import assert from "node:assert/strict";
import { beforeEach, describe, mock, test } from "node:test";

const texts: string[] = [];
const inserted: unknown[] = [];
let linked = false;
let tokenReplies: Array<Record<string, unknown>> = [];

mock.module("../db/channel-links.js", {
  exports: { findChannelLink: async () => (linked ? { clerkUserId: "clerk_1" } : undefined) },
});
mock.module("../db/index.js", {
  exports: {
    db: {
      insert: () => ({
        values: (v: unknown) => ({ onConflictDoNothing: async () => (inserted.push(v), (linked = true)) }),
      }),
    },
  },
});
mock.module("./channels.js", {
  exports: { sendChannelText: async (_p: string, _c: string, text: string) => void texts.push(text) },
});

process.env.CLERK_OAUTH_ISSUER = "https://clerk.example";
process.env.CLERK_OAUTH_CLIENT_ID = "id";
process.env.CLERK_OAUTH_CLIENT_SECRET = "secret";
globalThis.fetch = (async (url: string) => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  if (url.endsWith("/oauth/device_authorization")) {
    return json({ device_code: "dc", user_code: "ABCD", verification_uri: "https://v", verification_uri_complete: "https://v?c=ABCD", expires_in: 600, interval: 5 });
  }
  if (url.endsWith("/oauth/token")) {
    const reply = tokenReplies.shift() ?? { error: "authorization_pending" };
    return json(reply, "error" in reply ? 400 : 200);
  }
  if (url.endsWith("/oauth/userinfo")) return json({ sub: "clerk_1", email: "a@b.c" });
  throw new Error(`unexpected fetch ${url}`);
}) as typeof fetch;

const { InngestTestEngine } = await import("@inngest/test");
const { linkChannelAccount } = await import("./link-account.js");
const event = { name: "chat/account.link.requested", data: { platform: "telegram", externalUserId: "9", chatId: "42" } };
const sleeps = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `wait-${i}`, handler() {} }));

beforeEach(() => {
  texts.length = 0;
  inserted.length = 0;
  linked = false;
  tokenReplies = [];
});

describe("link-channel-account", () => {
  test("sends the sign-in link, waits, and links the user once approved", async () => {
    tokenReplies = [{ error: "authorization_pending" }, { error: "slow_down" }, { access_token: "tok" }];
    const { result, error } = await new InngestTestEngine({ function: linkChannelAccount }).execute({ events: [event as never], steps: sleeps(4) });
    assert.equal(error, undefined);
    assert.deepEqual(result, { status: "linked", clerkUserId: "clerk_1" });
    assert.match(texts[0]!, /https:\/\/v\?c=ABCD/);
    assert.match(texts[1]!, /connected as a@b\.c/);
    assert.equal(inserted.length, 1);
  });

  test("tells the user when they cancel", async () => {
    tokenReplies = [{ error: "access_denied" }];
    const { result } = await new InngestTestEngine({ function: linkChannelAccount }).execute({ events: [event as never], steps: sleeps(2) });
    assert.deepEqual(result, { status: "denied" });
    assert.match(texts.at(-1)!, /cancelled/);
  });

  test("tells the user when the code expires", async () => {
    tokenReplies = [{ error: "expired_token" }];
    const { result } = await new InngestTestEngine({ function: linkChannelAccount }).execute({ events: [event as never], steps: sleeps(2) });
    assert.deepEqual(result, { status: "expired" });
    assert.match(texts.at(-1)!, /expired/);
  });

  test("does nothing for a user who is already linked", async () => {
    linked = true;
    const { result } = await new InngestTestEngine({ function: linkChannelAccount }).execute({ events: [event as never] });
    assert.deepEqual(result, { status: "already-linked" });
    assert.deepEqual(texts, []);
  });
});
