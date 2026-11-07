import assert from "node:assert/strict";
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { after, afterEach, before, describe, test } from "node:test";
import { generateText } from "ai";
import { chatModel, modelId, toolFilesAsUserMessages } from "./model.js";

type Prompt = Parameters<typeof toolFilesAsUserMessages>[0];

const toolMessage = (value: unknown[]): Prompt[number] => ({
  role: "tool",
  content: [
    {
      type: "tool-result",
      toolCallId: "t1",
      toolName: "computer",
      output: { type: "content", value } as never,
    },
  ],
});
const shot = { type: "file", mediaType: "image/jpeg", data: { type: "data", data: "QUJD" } };

test("tool-result images move into a following user message", () => {
  const out = toolFilesAsUserMessages([
    toolMessage([{ type: "text", text: "clicked" }, shot]),
  ]);
  assert.equal(out.length, 2);
  const tool = out[0] as Extract<Prompt[number], { role: "tool" }>;
  assert.deepEqual((tool.content[0] as { output: unknown }).output, {
    type: "text",
    value: "clicked\n[The file is shown in the next message.]",
  });
  const user = out[1] as Extract<Prompt[number], { role: "user" }>;
  assert.equal(user.role, "user");
  assert.deepEqual(user.content[1], shot);
});

test("results without files, and files that can't be shown, stay in the tool message", () => {
  const plain: Prompt[number] = {
    role: "tool",
    content: [{ type: "tool-result", toolCallId: "t", toolName: "x", output: { type: "text", value: "ok" } }],
  };
  assert.deepEqual(toolFilesAsUserMessages([plain]), [plain]);
  const zip = toolFilesAsUserMessages([toolMessage([{ type: "file", mediaType: "application/zip", data: { type: "data", data: "QQ==" } }])]);
  assert.equal(zip.length, 1);
});

describe("chat model over an OpenAI-compatible endpoint", () => {
  const requests: { path: string; auth?: string; body: any }[] = [];
  const server = createServer(async (req: IncomingMessage, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    requests.push({ path: req.url!, auth: req.headers.authorization, body: JSON.parse(raw) });
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        id: "c1",
        object: "chat.completion",
        created: 1,
        model: "test-model",
        choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: "hello back" } }],
        usage: { prompt_tokens: 11, completion_tokens: 3, total_tokens: 14 },
      })
    );
  });
  before(() => new Promise<void>((resolve) => server.listen(0, resolve)));
  after(() => void server.close());
  afterEach(() => {
    requests.length = 0;
    delete process.env.OPENAI_BASEURL;
    delete process.env.OPENAI_MODEL;
    delete process.env.OPENAI_API_KEY;
  });

  const configure = () => {
    process.env.OPENAI_BASEURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
    process.env.OPENAI_MODEL = "test-model";
    process.env.OPENAI_API_KEY = "sk-test";
  };

  test("reads the base URL, model and key from the environment", async () => {
    configure();
    assert.equal(modelId(), "test-model");
    const result = await generateText({ model: chatModel(), prompt: "hi" });
    assert.equal(result.text, "hello back");
    assert.equal(result.usage.inputTokens, 11);
    assert.equal(requests[0]!.path, "/v1/chat/completions");
    assert.equal(requests[0]!.auth, "Bearer sk-test");
    assert.equal(requests[0]!.body.model, "test-model");
  });

  test("a screenshot reaches the endpoint as an image in a user message, not as base64 text", async () => {
    configure();
    await generateText({
      model: chatModel(),
      messages: [
        { role: "user", content: "look" },
        { role: "assistant", content: [{ type: "tool-call", toolCallId: "t1", toolName: "computer", input: {} }] },
        {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: "t1",
              toolName: "computer",
              output: {
                type: "content",
                value: [
                  { type: "text", text: "done" },
                  { type: "file", mediaType: "image/jpeg", data: { type: "data", data: "QUJD" } },
                ],
              },
            },
          ],
        },
      ],
    });
    const sent = requests[0]!.body.messages;
    const toolMsg = sent.find((m: { role: string }) => m.role === "tool");
    assert.equal(typeof toolMsg.content, "string");
    assert.doesNotMatch(toolMsg.content, /QUJD/);
    const last = sent.at(-1);
    assert.equal(last.role, "user");
    assert.equal(last.content.find((p: { type: string }) => p.type === "image_url").image_url.url, "data:image/jpeg;base64,QUJD");
  });

  test("a missing setting fails with its name", () => {
    assert.throws(() => chatModel(), /OPENAI_BASEURL is not set/);
    process.env.OPENAI_BASEURL = "http://x/v1";
    assert.throws(() => chatModel(), /OPENAI_API_KEY is not set|OPENAI_MODEL is not set/);
  });
});
