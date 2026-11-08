import type { Tool } from "ai";
import { executeComputerTool, computerToolSchemas, isComputerTool, ToolInputError, type ToolOutput, type ComputerContext } from "./computer-tools.js";
import {
  executeGmailTool,
  gmailToolSchemas,
  isGmailTool,
  type GmailContext,
} from "./gmail-tools.js";
import {
  executeReminderTool,
  isReminderTool,
  reminderToolSchemas,
  type ReminderContext,
} from "./reminder-tools.js";
import { webTools } from "./web-tools.js";

export { ToolInputError };
export type { ToolOutput };

const withoutExecute = ([name, { execute, toModelOutput, ...definition }]: [string, Tool]) => [
  name,
  definition,
];

// The tools as the model sees them: schemas only. The turn runs each call itself, as a durable
// step, so a slow or failing tool is retried alone instead of repeating the model call before it
export const modelTools = {
  ...(Object.fromEntries(Object.entries(webTools).map(withoutExecute)) as Record<string, Tool>),
  ...computerToolSchemas,
  ...reminderToolSchemas,
  ...gmailToolSchemas,
};

export const isWebTool = (name: string): name is keyof typeof webTools =>
  Object.hasOwn(webTools, name);

export { isComputerTool, isReminderTool, isGmailTool, executeReminderTool, executeGmailTool };
export type { ReminderContext, GmailContext };

const isAsyncIterable = (value: unknown): value is AsyncIterable<unknown> =>
  typeof value === "object" && value !== null && Symbol.asyncIterator in value;

// Runs a web tool and converts its result the way the SDK would have
export const executeWebTool = async (
  name: keyof typeof webTools,
  input: unknown,
  toolCallId: string
): Promise<ToolOutput> => {
  const definition = webTools[name] as Tool;
  const result = await definition.execute!(input as never, { toolCallId, messages: [] } as never);
  let output: unknown = result;
  if (isAsyncIterable(result)) {
    for await (const chunk of result) output = chunk;
  }
  if (definition.toModelOutput) {
    return (await definition.toModelOutput({ toolCallId, input, output } as never)) as ToolOutput;
  }
  return { type: "json", value: (output ?? null) as never };
};

export { executeComputerTool };
export type { ComputerContext };
