import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { BillingLookupError, hasProPlan } from "./billing.js";
import { gateErrorAttributes } from "./channel-gate.js";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});
const reply = (status: number, body: unknown) => {
  globalThis.fetch = (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;
};

test("a rejected lookup reports Clerk's status and error code, not its body", async () => {
  reply(401, { errors: [{ code: "authentication_invalid", message: "secret detail" }] });
  const error = await hasProPlan("user_1").catch((e) => e);
  assert.ok(error instanceof BillingLookupError);
  assert.deepEqual(gateErrorAttributes(error), {
    "error.name": "BillingLookupError",
    "http.response.status_code": 401,
    "clerk.error_code": "authentication_invalid",
  });
  assert.equal(JSON.stringify(gateErrorAttributes(error)).includes("secret detail"), false);
});

test("a missing subscription is not an error, and an active pro item counts", async () => {
  reply(404, {});
  assert.equal(await hasProPlan("user_1"), false);
  reply(200, { subscription_items: [{ status: "active", plan: { slug: "pro" } }] });
  assert.equal(await hasProPlan("user_1"), true);
});

test("other errors only report their class", () => {
  assert.deepEqual(gateErrorAttributes(new TypeError("fetch failed: secret")), { "error.name": "TypeError" });
});
