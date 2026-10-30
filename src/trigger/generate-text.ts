import { logger, task } from "@trigger.dev/sdk";
import { generateText } from "ai";
import { neon } from "@neon/ai-sdk-provider";

// Temporary task backing the public GET /test/ai endpoint. Remove together with src/test.ts.
export const generateTextTask = task({
  id: "generate-text",
  maxDuration: 60,
  run: async (payload: { prompt: string }) => {
    const { text, usage } = await generateText({
      model: neon("gpt-5-4-nano"),
      instructions: "You are a helpful, concise personal assistant.",
      prompt: payload.prompt,
    });

    logger.log("Generated text", { usage });

    return { text };
  },
});
