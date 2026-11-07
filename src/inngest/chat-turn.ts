import * as Sentry from "@sentry/node";
import { generateText, stepCountIs, type ModelMessage } from "ai";
import { NonRetriableError, type GetStepTools } from "inngest";
import {
  acquireLock,
  claimPending,
  dropClaimed,
  hasPending,
  loadTranscript,
  markProcessed,
  releaseLock,
  releaseLockIfIdle,
  renewLock,
  saveTranscript,
} from "../db/chat.js";
import type { Platform } from "../db/schema.js";
import { log } from "../log.js";
import {
  dropOldImages,
  pendingToolCalls,
  resolveFiles,
  stripForStorage,
  userMessageFrom,
  windowMessages,
  type ToolResultPart,
} from "./agent-messages.js";
import {
  executeComputerTool,
  executeWebTool,
  isComputerTool,
  isWebTool,
  modelTools,
  ToolInputError,
  type ToolOutput,
} from "./agent-tools.js";
import { CHANNELS } from "./channels.js";
import { inngest } from "./client.js";
import {
  abandonCommand,
  computerToolsInstructions,
  ensureSandbox,
  parseRunCommand,
  pollCommand,
  startCommand,
} from "./computer-tools.js";
import { chatMessageReceived } from "./events.js";
import { reportFailure } from "./failure.js";
import { chatModel } from "./model.js";
import { webToolsInstructions } from "./web-tools.js";

const MODEL_ID = "claude-opus-5-5";
// Model calls per user turn, as before. Each is one durable step
const MAX_MODEL_CALLS = 40;
// Turns one run answers back to back before handing over to a fresh run
const MAX_TURNS_PER_RUN = 25;
const MAX_INLINE_IMAGES = 3;
// A run is limited to 1,000 steps and 32 MiB of state. Past this many steps it hands the
// conversation to a fresh run between two turns
const MAX_STEPS_PER_RUN = 400;
// A model call must end well inside a Vercel request (checkpointing stops starting new steps after
// 150 seconds, and a function is stopped at 300)
const MODEL_TIMEOUT_MS = 120_000;
// How often a running command is checked on. Sleeping holds no worker and no function invocation
const COMMAND_POLL_SECONDS = 30;

const ERROR_REPLY = "Sorry, something went wrong. Please try again.";
const UNFINISHED_REPLY = "Sorry, I couldn't finish that. Please try again.";

type Step = GetStepTools<typeof inngest>;
// Renews the conversation lock, and fails the step when another run has taken it over
type KeepLock = () => Promise<void>;
type Call = { toolCallId: string; toolName: string; input: unknown };
type Json<T> = T; // step results come back JSON-serialized; the shapes used here survive that

const errorOutput = (message: string): ToolOutput => ({
  type: "error-text",
  value: message.slice(0, 500),
});

// A command runs in the background of the computer while the run sleeps: it is started, checked on
// every COMMAND_POLL_SECONDS, and abandoned once it outlives its timeout
const runCommand = async (
  step: Step,
  keepLock: KeepLock,
  id: string,
  sandboxName: string,
  call: Call
): Promise<ToolOutput> => {
  const { command, timeoutSeconds } = parseRunCommand(call.input);
  let progress = await step.run(`command-start-${id}`, async () => {
    await keepLock();
    return startCommand(sandboxName, call.toolCallId, command);
  });
  const maxPolls = Math.ceil(timeoutSeconds / COMMAND_POLL_SECONDS);
  for (let poll = 0; !progress.done && poll < maxPolls; poll++) {
    const { sessionId, commandId } = progress;
    await step.sleep(`command-wait-${id}-${poll}`, `${COMMAND_POLL_SECONDS}s`);
    progress = await step.run(`command-poll-${id}-${poll}`, async () => {
      await keepLock();
      return pollCommand(sandboxName, sessionId, commandId);
    });
  }
  if (!progress.done) {
    const { sessionId, commandId } = progress;
    progress = await step.run(`command-abandon-${id}`, () =>
      abandonCommand(sandboxName, sessionId, commandId, timeoutSeconds)
    );
  }
  return { type: "json", value: { exitCode: progress.exitCode, output: progress.output } };
};

// Any other tool call is one step. Mistakes the model made come back as results it can correct;
// real failures throw, so the step is retried, and only a failure that outlasts the retries is
// reported to the model as an error
const runTool = async (
  step: Step,
  keepLock: KeepLock,
  id: string,
  call: Call,
  context: { sandboxName: string; platform: Platform; chatId: string }
): Promise<ToolResultPart> => {
  const channel = CHANNELS[context.platform];
  const result = (output: ToolOutput): ToolResultPart => ({
    type: "tool-result",
    toolCallId: call.toolCallId,
    toolName: call.toolName,
    output,
  });
  try {
    if (call.toolName === "runCommand") {
      return result(await runCommand(step, keepLock, id, context.sandboxName, call));
    }
    return result(
      (await step.run(`tool-${id}`, async (): Promise<ToolOutput> => {
        await keepLock();
        try {
          if (isComputerTool(call.toolName)) {
            return await executeComputerTool(call.toolName as never, call.input, {
              sandboxName: context.sandboxName,
              channel,
              chatId: context.chatId,
              toolCallId: call.toolCallId,
            });
          }
          if (isWebTool(call.toolName)) {
            return await executeWebTool(call.toolName, call.input, call.toolCallId);
          }
          return errorOutput(`Unknown tool: ${call.toolName}`);
        } catch (error) {
          if (error instanceof ToolInputError) return errorOutput(error.message);
          Sentry.captureException(error, { tags: { "gen_ai.tool.name": call.toolName } });
          throw error;
        }
      })) as Json<ToolOutput>
    );
  } catch (error) {
    return result(
      errorOutput(`The tool failed: ${error instanceof Error ? error.message : String(error)}`)
    );
  }
};

const systemPrompt = (platformName: string) =>
  [
    `You are a helpful, concise personal assistant chatting over ${platformName}.`,
    // Set per turn so relative requests like "tonight" or "this weekend" resolve correctly
    `Today is ${new Date().toUTCString()}.`,
    webToolsInstructions,
    computerToolsInstructions,
  ].join("\n\n");

type Usage = { input: number; output: number; cached: number };

// One user turn: the model is called step by step, each call and tool call durable on its own
const runAgentTurn = async ({
  step,
  keepLock,
  turn,
  platform,
  clerkUserId,
  chatId,
  history,
  inbox,
}: {
  step: Step;
  keepLock: KeepLock;
  turn: number;
  platform: Platform;
  clerkUserId: string;
  chatId: string;
  history: ModelMessage[];
  inbox: { parts: Parameters<typeof userMessageFrom>[0][number]["parts"] }[];
}) => {
  const channel = CHANNELS[platform];
  // One computer per user, whichever platform they write from
  const sandboxName = `user-${clerkUserId}`;
  const messages: ModelMessage[] = [...history, userMessageFrom(inbox)];
  const usage: Usage = { input: 0, output: 0, cached: 0 };
  let toolCalls = 0;
  let modelCalls = 0;
  let sandboxReady = false;
  let reply = "";

  for (let i = 0; i < MAX_MODEL_CALLS; i++) {
    const call = (await step.run(`model-${turn}-${i}`, async () => {
      await keepLock();
      // Refreshes the typing bubble, which clears itself after about a minute and a half
      await channel.setWorking(chatId, true);
      const result = await generateText({
        model: chatModel(MODEL_ID),
        system: systemPrompt(channel.platformName),
        messages: await resolveFiles(dropOldImages(messages, MAX_INLINE_IMAGES), platform, channel),
        tools: modelTools,
        // One model call per step: the turn runs the tools itself
        stopWhen: stepCountIs(1),
        maxRetries: 1,
        abortSignal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
        // Names the agent on its gen_ai spans in Sentry. Content recording is decided by the
        // Sentry integration in instrument.ts
        experimental_telemetry: { isEnabled: true, functionId: `${platform}-agent` },
      });
      return {
        messages: result.response.messages,
        text: result.text,
        usage: {
          input: result.usage.inputTokens ?? 0,
          output: result.usage.outputTokens ?? 0,
          cached: result.usage.inputTokenDetails?.cacheReadTokens ?? 0,
        },
      };
    })) as unknown as { messages: ModelMessage[]; text: string; usage: Usage };

    modelCalls++;
    usage.input += call.usage.input;
    usage.output += call.usage.output;
    usage.cached += call.usage.cached;

    const pending = pendingToolCalls(call.messages);
    // Calls the SDK already answered itself (input that didn't match the schema) leave nothing to
    // run, but the model still has to see the error: only a reply without any tool call ends the turn
    const madeToolCalls = call.messages.some(
      (message) =>
        message.role === "assistant" &&
        typeof message.content !== "string" &&
        message.content.some((part) => part.type === "tool-call")
    );
    if (!madeToolCalls) {
      // An empty final message would be rejected when the conversation is sent again
      if (call.text.trim()) {
        messages.push(...call.messages);
        reply = call.text;
      }
      break;
    }
    // The cap was reached with tool calls unanswered: they are dropped, so the stored conversation
    // never holds a call without a result
    if (i === MAX_MODEL_CALLS - 1 && pending.length > 0) break;
    messages.push(...call.messages);
    if (pending.length === 0) continue;

    if (!sandboxReady && pending.some((tool) => isComputerTool(tool.toolName))) {
      await step.run(`sandbox-${turn}`, async () => {
        await keepLock();
        await ensureSandbox(sandboxName);
      });
      sandboxReady = true;
    }
    toolCalls += pending.length;
    const results = await Promise.all(
      pending.map((tool) =>
        runTool(step, keepLock, `${turn}-${i}-${tool.toolCallId}`, tool, { sandboxName, platform, chatId })
      )
    );
    messages.push({ role: "tool", content: results });
  }

  if (!reply) {
    reply = UNFINISHED_REPLY;
    messages.push({ role: "assistant", content: reply });
  }
  return { messages, reply, usage, toolCalls, modelCalls };
};

export const chatTurn = inngest.createFunction(
  {
    id: "chat-turn",
    triggers: [chatMessageReceived],
    // Each step is retried this often. The delivery step can repeat a chunk it already sent, which
    // is better than losing a reply
    retries: 2,
    onFailure: async ({ event, error }) => {
      const { platform, clerkUserId, chatId } = (
        event.data.event as { data: { platform: Platform; clerkUserId: string; chatId: string } }
      ).data;
      const conversation = { platform, clerkUserId };
      const runId = event.data.run_id;
      await reportFailure(error, { function: "chat-turn", runId, clerkUserId });
      const channel = CHANNELS[platform];
      // Only the run that still owns the conversation cleans up: after losing the lock, another run
      // is answering these messages, and the user hears from that one
      if (await renewLock(conversation, runId)) {
        await dropClaimed(conversation, runId);
        await releaseLock(conversation, runId);
        await channel.setWorking(chatId, false);
        try {
          await channel.sendText(chatId, ERROR_REPLY);
        } catch (sendError) {
          await reportFailure(sendError, { function: "chat-turn", runId, clerkUserId });
        }
        // Messages that arrived after the failed turn's claim still wait for an answer
        if (await hasPending(conversation)) {
          await inngest.send(chatMessageReceived.create({ platform, clerkUserId, chatId }));
        }
      }
      log.error("Agent turn failed", { "channel.platform": platform, "inngest.run_id": runId });
    },
  },
  async ({ event, step: rawStep, runId }) => {
    const { platform, clerkUserId, chatId } = event.data;
    const conversation = { platform, clerkUserId };
    const keepLock: KeepLock = async () => {
      if (!(await renewLock(conversation, runId))) {
        throw new NonRetriableError("The conversation lock was lost");
      }
    };
    // Counts the steps this run has used, to hand over before the platform's limits
    let stepsUsed = 0;
    const step = new Proxy(rawStep, {
      get(target, property, receiver) {
        const value = Reflect.get(target, property, receiver);
        if (typeof value !== "function" || (property !== "run" && property !== "sleep")) return value;
        return (...args: unknown[]) => {
          stepsUsed++;
          return value.apply(target, args);
        };
      },
    }) as Step;

    // One turn at a time per conversation. A message that finds the conversation busy ends here: it
    // is already in the inbox, and the running turn picks it up
    const acquired = await step.run("acquire-lock", () => acquireLock(conversation, runId));
    if (!acquired) return { status: "busy" as const };

    let history = (await step.run("load-transcript", () =>
      loadTranscript(conversation)
    )) as unknown as ModelMessage[];

    for (let turn = 0; turn < MAX_TURNS_PER_RUN && stepsUsed < MAX_STEPS_PER_RUN; turn++) {
      const inbox = await step.run(`claim-${turn}`, async () => {
        await keepLock();
        const rows = await claimPending(conversation, runId);
        return rows.map(({ id, chatId: rowChatId, parts }) => ({ id, chatId: rowChatId, parts }));
      });

      if (inbox.length === 0) {
        // Released only when nothing arrived meanwhile; otherwise go around again
        const released = await step.run(`release-${turn}`, async () => {
          // A retried step finds the lock already released: that counts as released
          return (await releaseLockIfIdle(conversation, runId)) || !(await renewLock(conversation, runId));
        });
        if (released) return { status: "done" as const, turns: turn };
        continue;
      }

      // Replies go where the newest message came from
      const replyChatId = inbox.at(-1)!.chatId;
      const result = await runAgentTurn({
        step,
        keepLock,
        turn,
        platform,
        clerkUserId,
        chatId: replyChatId,
        history,
        inbox,
      });

      await step.run(`deliver-${turn}`, async () => {
        await keepLock();
        await CHANNELS[platform].sendText(replyChatId, result.reply);
      });

      history = windowMessages(stripForStorage(result.messages));
      await step.run(`finish-${turn}`, async () => {
        await keepLock();
        await saveTranscript(conversation, history);
        await markProcessed(inbox.map((row) => row.id));
        await CHANNELS[platform].setWorking(replyChatId, false);
        // One record per turn, so token use and cost per user stay complete even where traces
        // aren't kept
        log.info("Agent turn finished", {
          "gen_ai.agent.name": `${platform}-agent`,
          "gen_ai.request.model": MODEL_ID,
          "channel.platform": CHANNELS[platform].platformName,
          "gen_ai.usage.input_tokens": result.usage.input,
          "gen_ai.usage.input_tokens.cached": result.usage.cached,
          "gen_ai.usage.output_tokens": result.usage.output,
          "agent.steps": result.modelCalls,
          "agent.tool_calls": result.toolCalls,
        });
      });
    }

    // A long backlog or a step-heavy run: hand the conversation to a fresh run
    await step.run("release-handoff", () => releaseLock(conversation, runId));
    await step.sendEvent("continue", chatMessageReceived.create({ platform, clerkUserId, chatId }));
    return { status: "handed-off" as const };
  }
);
