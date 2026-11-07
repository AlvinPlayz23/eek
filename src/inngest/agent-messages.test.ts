import assert from "node:assert/strict";
import { test } from "node:test";
import type { ModelMessage } from "ai";
import {
  dropOldImages,
  IMAGE_NOTE,
  pendingToolCalls,
  stripForStorage,
  windowMessages,
} from "./agent-messages.js";

const shot = (id: string): ModelMessage => ({
  role: "tool",
  content: [
    {
      type: "tool-result",
      toolCallId: id,
      toolName: "computer",
      output: {
        type: "content",
        value: [
          { type: "text", text: id },
          { type: "file", mediaType: "image/jpeg", data: { type: "data", data: "AAAA" } },
        ],
      },
    },
  ],
});

const results = (m: ModelMessage) =>
  m.role === "tool" ? m.content.flatMap((p) => (p.type === "tool-result" ? [p] : [])) : [];

const hasImage = (m: ModelMessage) => results(m).some((p) => p.output.type === "content");

test("dropOldImages keeps only the newest images", () => {
  const out = dropOldImages([shot("a"), shot("b"), shot("c")], 2);
  assert.deepEqual(out.map(hasImage), [false, true, true]);
  assert.deepEqual(results(out[0]!)[0]!.output, { type: "text", value: `a\n${IMAGE_NOTE}` });
});

test("stripForStorage removes files and images", () => {
  const out = stripForStorage([
    { role: "user", content: [{ type: "text", text: "hi" }, { type: "file", data: "https://x.invalid/f", mediaType: "image/png" }] },
    { role: "user", content: [{ type: "file", data: "https://x.invalid/f", mediaType: "image/png" }] },
    shot("a"),
  ]);
  assert.deepEqual(out[0], { role: "user", content: [{ type: "text", text: "hi" }] });
  assert.deepEqual(out[1], { role: "user", content: [{ type: "text", text: "[attachment]" }] });
  assert.equal(hasImage(out[2]!), false);
});

test("windowMessages starts at a user message and respects the size cap", () => {
  const msgs: ModelMessage[] = [];
  for (let i = 0; i < 10; i++) {
    msgs.push({ role: "user", content: `q${i}` }, { role: "assistant", content: `a${i}` });
  }
  const byCount = windowMessages(msgs, { maxMessages: 5 });
  assert.equal(byCount[0]!.role, "user");
  assert.ok(byCount.length <= 5);
  const bySize = windowMessages(msgs, { maxChars: 120 });
  assert.equal(bySize[0]!.role, "user");
  assert.ok(JSON.stringify(bySize).length <= 120 || bySize.length === 2);
});

test("pendingToolCalls skips calls that already have a result", () => {
  const calls = pendingToolCalls([
    {
      role: "assistant",
      content: [
        { type: "tool-call", toolCallId: "1", toolName: "runCommand", input: {} },
        { type: "tool-call", toolCallId: "2", toolName: "bad", input: {} },
      ],
    },
    { role: "tool", content: [{ type: "tool-result", toolCallId: "2", toolName: "bad", output: { type: "error-text", value: "invalid" } }] },
  ]);
  assert.deepEqual(calls.map((c) => c.toolCallId), ["1"]);
});
