import assert from "node:assert/strict";
import { test } from "node:test";
import { auth } from "./auth.js";

test("polling without a device cookie is a handled expiry", async () => {
  const res = await auth.request("/poll", { method: "POST" });

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: "expired" });
});
