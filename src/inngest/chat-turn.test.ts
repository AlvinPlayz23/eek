import assert from "node:assert/strict";
import { beforeEach, describe, mock, test } from "node:test";
import * as ai from "ai";

// The services around the turn are replaced: the store, the chat platform and the model. What runs
// for real is the Inngest function: its steps, the lock handoff and the tool loop
const calls = {
  sent: [] as string[],
  saved: [] as unknown[][],
  processed: [] as string[][],
  prompts: [] as unknown[][],
  failed: [] as string[],
};
let lockFree = true;
let inbox: { id: string; chatId: string; parts: unknown[] }[] = [];
let modelReplies: Array<() => { messages: unknown[]; text: string }> = [];

mock.module("../db/chat.js", {
  exports: {
    acquireLock: async () => lockFree,
    renewLock: async () => true,
    releaseLock: async () => {},
    releaseLockIfIdle: async () => inbox.length === 0,
    dropClaimed: async () => {},
    hasPending: async () => false,
    loadTranscript: async () => [{ role: "user", content: "earlier" }],
    claimPending: async () => {
      const rows = inbox;
      inbox = [];
      return rows;
    },
    markProcessed: async (ids: string[]) => void calls.processed.push(ids),
    saveTranscript: async (_c: unknown, messages: unknown[]) => void calls.saved.push(messages),
  },
});
const channel = {
  platformName: "Telegram",
  maxSendBytes: 1,
  sendText: async (_chat: string, text: string) => void calls.sent.push(text),
  sendFile: async () => {},
  downloadAttachment: async () => new Uint8Array(),
  setWorking: async () => {},
};
mock.module("./channels.js", { exports: { CHANNELS: { telegram: channel, linq: channel }, sendChannelText: async () => {} } });
mock.module("./model.js", { exports: { chatModel: () => ({}), modelId: () => "test-model" } });
mock.module("ai", {
  exports: {
    ...ai,
    generateText: async (options: { messages: unknown[] }) => {
      calls.prompts.push(structuredClone(options.messages));
      const next = modelReplies.shift();
      assert.ok(next, "the model was called more often than the test expected");
      const { messages, text } = next();
      return { response: { messages }, text, usage: { inputTokens: 10, outputTokens: 5 } };
    },
  },
});
let started = 0;
let polls = 0;
mock.module("./computer-tools.js", {
  exports: {
    ...(await import("./computer-tools.js")),
    ensureSandbox: async () => {},
    startCommand: async () => (started++, { done: false, sessionId: "s", commandId: "c" }),
    pollCommand: async () =>
      ++polls < 2 ? { done: false, sessionId: "s", commandId: "c" } : { done: true, exitCode: 0, output: "hello" },
    abandonCommand: async () => ({ done: true, exitCode: null, output: "timed out" }),
  },
});

const { InngestTestEngine } = await import("@inngest/test");
const { chatTurn } = await import("./chat-turn.js");

const event = { name: "chat/message.received", data: { platform: "telegram", clerkUserId: "u1", chatId: "42" } };
const row = (id: string, text: string) => ({ id, chatId: "42", parts: [{ type: "text", text }] });
const assistant = (content: unknown, text = "") => () => ({
  messages: [{ role: "assistant", content }],
  text,
});

beforeEach(() => {
  Object.assign(calls, { sent: [], saved: [], processed: [], prompts: [], failed: [] });
  lockFree = true;
  inbox = [row("r1", "hello")];
  modelReplies = [];
  started = 0;
  polls = 0;
});


describe("chat-turn", () => {
  beforeEach(() => {
    engine = new InngestTestEngine({ function: chatTurn });
  });

  // A fresh engine per test: it remembers the steps of earlier runs
  let engine: InstanceType<typeof InngestTestEngine>;

  test("answers a message and stores the conversation", async () => {
    modelReplies = [assistant([{ type: "text", text: "Hi there" }], "Hi there")];
    const { result, error } = await engine.execute({ events: [event as never] });
    assert.equal(error, undefined);
    assert.deepEqual(result, { status: "done", turns: 1 });
    assert.deepEqual(calls.sent, ["Hi there"]);
    assert.deepEqual(calls.processed, [["r1"]]);
    const stored = calls.saved[0]!;
    assert.equal(stored.length, 3);
    assert.deepEqual(stored[1], { role: "user", content: [{ type: "text", text: "hello" }] });
  });

  test("does nothing while another run owns the conversation", async () => {
    lockFree = false;
    const { result } = await engine.execute({ events: [event as never] });
    assert.deepEqual(result, { status: "busy" });
    assert.deepEqual(calls.sent, []);
  });

  test("a mistaken tool call comes back to the model as an error", async () => {
    modelReplies = [
      assistant([{ type: "tool-call", toolCallId: "t1", toolName: "nope", input: {} }]),
      assistant([{ type: "text", text: "Done" }], "Done"),
    ];
    const { error } = await engine.execute({ events: [event as never] });
    assert.equal(error, undefined);
    const second = calls.prompts[1]!;
    const toolMessage = second.at(-1) as { role: string; content: { output: { type: string; value: string } }[] };
    assert.equal(toolMessage.role, "tool");
    assert.equal(toolMessage.content[0]!.output.type, "error-text");
    assert.deepEqual(calls.sent, ["Done"]);
  });

  test("tool calls the SDK already rejected don't end the turn: the model sees the error", async () => {
    modelReplies = [
      () => ({
        messages: [
          { role: "assistant", content: [{ type: "text", text: "Checking" }, { type: "tool-call", toolCallId: "t1", toolName: "runCommand", input: { oops: 1 } }] },
          { role: "tool", content: [{ type: "tool-result", toolCallId: "t1", toolName: "runCommand", output: { type: "error-text", value: "Invalid input" } }] },
        ],
        text: "Checking",
      }),
      assistant([{ type: "text", text: "Fixed" }], "Fixed"),
    ];
    const { error } = await engine.execute({ events: [event as never] });
    assert.equal(error, undefined);
    assert.equal(started, 0);
    const second = calls.prompts[1]!;
    assert.equal((second.at(-1) as { role: string }).role, "tool");
    assert.deepEqual(calls.sent, ["Fixed"]);
  });

  test("a command is started, polled between sleeps and its result reaches the model", async () => {
    modelReplies = [
      assistant([{ type: "tool-call", toolCallId: "t1", toolName: "runCommand", input: { command: "echo hello" } }]),
      assistant([{ type: "text", text: "It said hello" }], "It said hello"),
    ];
    const { error } = await engine.execute({
      events: [event as never],
      steps: ["0", "1"].map((poll) => ({ id: `command-wait-0-0-t1-${poll}`, handler() {} })),
    });
    assert.equal(error, undefined);
    assert.equal(started, 1);
    assert.equal(polls, 2);
    const toolMessage = calls.prompts[1]!.at(-1) as { content: { output: { value: unknown } }[] };
    assert.deepEqual(toolMessage.content[0]!.output.value, { exitCode: 0, output: "hello" });
    assert.deepEqual(calls.sent, ["It said hello"]);
  });

  test("an empty final reply is replaced and not stored", async () => {
    modelReplies = [assistant([{ type: "text", text: "" }], "")];
    await engine.execute({ events: [event as never] });
    assert.match(calls.sent[0]!, /couldn't finish/);
    const stored = calls.saved[0]!.at(-1) as { role: string; content: string };
    assert.equal(stored.role, "assistant");
    assert.match(stored.content, /couldn't finish/);
  });
});
