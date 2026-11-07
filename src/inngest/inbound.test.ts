import assert from "node:assert/strict";
import { test } from "node:test";
import { parseLinqMessage, parseTelegramMessage } from "./inbound.js";

const linq = (parts: unknown[], extra: Record<string, unknown> = {}) =>
  ({
    id: "msg1",
    direction: "inbound",
    chat: { id: "chat1", is_group: false },
    parts,
    ...extra,
  }) as never;

test("linq: text and files become a message", () => {
  const inbound = parseLinqMessage(
    linq([
      { type: "text", value: "look" },
      { type: "media", id: "att1", filename: "a.png", mime_type: "image/png", size_bytes: 1000 },
    ])
  );
  assert.equal(inbound.kind, "message");
  if (inbound.kind !== "message") return;
  assert.equal(inbound.externalMessageId, "msg1");
  assert.equal(inbound.chatId, "chat1");
  assert.match((inbound.parts[0] as { text: string }).text, /attachment id: att1/);
  assert.equal((inbound.parts[1] as { data: string }).data, "https://linq.invalid/files/att1");
  assert.deepEqual(inbound.parts[2], { type: "text", text: "look" });
});

test("linq: app cards are unsupported, groups and outbound messages are ignored", () => {
  assert.equal(parseLinqMessage(linq([{ type: "imessage_app" }])).kind, "unsupported");
  assert.equal(parseLinqMessage(linq([{ type: "app_clip" }])).kind, "unsupported");
  assert.equal(parseLinqMessage(linq([{ type: "text", value: "x" }], { chat: { id: "c", is_group: true } })).kind, "ignore");
  assert.equal(parseLinqMessage(linq([{ type: "text", value: "x" }], { direction: "outbound" })).kind, "ignore");
});

test("telegram: ids are scoped to the chat, and groups are ignored", () => {
  const dm = parseTelegramMessage({ message_id: 5, chat: { id: 9, type: "private" }, text: "hi" });
  assert.equal(dm.kind === "message" && dm.externalMessageId, "9:5");
  assert.equal(parseTelegramMessage({ message_id: 5, chat: { id: 9, type: "group" }, text: "hi" }).kind, "ignore");
  assert.equal(parseTelegramMessage({ message_id: 5, chat: { id: 9, type: "private" } }).kind, "unsupported");
});
