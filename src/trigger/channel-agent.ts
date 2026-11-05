import { chat, defaultStorage, type AnyChannelConnector } from "@trigger.dev/sdk/ai";
import { stepCountIs } from "ai";
import { chatModel } from "./model.js";
import { computerTools, computerToolsInstructions, type ComputerSurface } from "./computer-tools.js";
import { webTools, webToolsInstructions } from "./web-tools.js";

// The computer surface a channel hands its tools. The sandbox belongs to the Clerk user, so the
// same files are there whichever platform they write from
export const channelSurface = ({
  clerkUserId,
  ...surface
}: Omit<ComputerSurface, "sandboxName"> & { clerkUserId: string }): ComputerSurface => ({
  sandboxName: `user-${clerkUserId}`,
  ...surface,
});

// The assistant on one chat platform: every channel gets the same model, tools and instructions,
// and only says which platform it is chatting over
export const channelAgent = <TId extends string>({
  id,
  channel,
  platformName,
}: {
  id: TId;
  channel: AnyChannelConnector;
  // How the platform is named to the model, e.g. "Telegram" or "iMessage"
  platformName: string;
}) =>
  chat.agent({
    id,
    channels: [channel],
    // Turns that work on files run many tool calls, well past the project's 5 minute default
    maxDuration: 30 * 60,
    // The platform's transcript snapshot: a run that boots after the previous one ended
    // loads the conversation from it, so the agent remembers the chat without a database
    storage: defaultStorage,
    tools: { ...webTools, ...computerTools },
    run: async ({ messages, tools, signal, streamText }) =>
      streamText({
        model: chatModel("claude-opus-5-5"),
        // Set per turn so relative requests like "tonight" or "this weekend" resolve correctly
        system: [
          `You are a helpful, concise personal assistant chatting over ${platformName}.`,
          `Today is ${new Date().toUTCString()}.`,
          webToolsInstructions,
          computerToolsInstructions,
        ].join("\n\n"),
        messages,
        tools,
        abortSignal: signal,
        stopWhen: stepCountIs(40),
      }),
  });
