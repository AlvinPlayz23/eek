import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { Hono } from "hono";
import { isPlatformEnabled, requirePlatform } from "./platforms.js";

afterEach(() => {
  delete process.env.LINQ_ENABLED;
});

test("telegram is always on; linq only with LINQ_ENABLED=true", () => {
  assert.equal(isPlatformEnabled("telegram"), true);
  assert.equal(isPlatformEnabled("linq"), false);
  process.env.LINQ_ENABLED = "false";
  assert.equal(isPlatformEnabled("linq"), false);
  process.env.LINQ_ENABLED = "true";
  assert.equal(isPlatformEnabled("linq"), true);
});

test("the guarded route answers 404 while off and reaches the handler when on", async () => {
  const app = new Hono();
  app.use("/linq/webhook", requirePlatform("linq"));
  app.post("/linq/webhook", (c) => c.text("handled"));

  const off = await app.request("/linq/webhook", { method: "POST" });
  assert.equal(off.status, 404);

  process.env.LINQ_ENABLED = "true";
  const on = await app.request("/linq/webhook", { method: "POST" });
  assert.equal(on.status, 200);
  assert.equal(await on.text(), "handled");
});
