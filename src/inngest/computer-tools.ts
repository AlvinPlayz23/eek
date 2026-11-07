import { posix } from "node:path";
import { Daytona, DaytonaNotFoundError, type Sandbox } from "@daytona/sdk";
import { tool, type ToolModelMessage } from "ai";
import { z } from "zod";
import { log } from "../log.js";
import type { Channel } from "./channels.js";

// The result of one tool call, in the shape the model reads it
export type ToolOutput = Extract<ToolModelMessage["content"][number], { type: "tool-result" }>["output"];

// A tool call the model got wrong (a directory instead of a file, a missing coordinate, a file too
// big to send). The model sees the message and corrects itself, so it isn't reported to Sentry as
// an error; failures of the sandbox or chat platforms still are
export class ToolInputError extends Error {
  override name = "ToolInputError";
}

const HOME = "/home/daytona";
const MAX_OUTPUT_CHARS = 20_000;
// Anthropic caps inline images at 5 MB once base64 encoded, and a step result is limited to 4 MiB:
// 2.8 MB of file is 3.7 MB of base64
const MAX_VIEW_BYTES = 2_800_000;

const MEDIA_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".json": "application/json",
  ".html": "text/html",
  ".zip": "application/zip",
};
const VIEWABLE = new Set(["application/pdf", "image/png", "image/jpeg", "image/gif", "image/webp"]);

const mediaTypeOf = (path: string) =>
  MEDIA_TYPES[posix.extname(path).toLowerCase()] ?? "application/octet-stream";

const resolvePath = (path: string) => posix.resolve(HOME, path);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Reads DAYTONA_API_KEY on first use, so importing this module works without it
let daytona: Daytona | undefined;
const client = () => (daytona ??= new Daytona());

const STARTING_STATES = new Set(["creating", "starting", "restoring", "resuming"]);

const readySandbox = async (name: string) => {
  let sandbox: Sandbox;
  try {
    sandbox = await client().get(name);
  } catch (error) {
    if (!(error instanceof DaytonaNotFoundError)) throw error;
    // A new sandbox per user is the main Daytona cost driver; also marks a user's first use or a
    // return after the week-long auto-delete
    log.info("Sandbox created", { "sandbox.previous_state": "none" });
    return client().create({
      name,
      labels: { app: "personal-assistant" },
      // Stopped after 15 idle minutes (the default); archive after a day to free disk quota, then
      // delete after a week so abandoned chats don't pile up
      autoArchiveInterval: 24 * 60,
      autoDeleteInterval: 7 * 24 * 60,
    });
  }
  if (STARTING_STATES.has(sandbox.state ?? "")) {
    await sandbox.waitUntilStarted(120);
  } else if (sandbox.state !== "started") {
    // Restoring an archived sandbox takes longer than waking a stopped one: the previous state
    // explains a slow first tool call in a turn
    const previousState = sandbox.state;
    const startedAt = Date.now();
    await sandbox.start(120);
    log.info("Sandbox started", {
      "sandbox.previous_state": previousState,
      "sandbox.start_ms": Date.now() - startedAt,
    });
  }
  return sandbox;
};

// Parallel tool calls in one step share a lookup instead of racing to create the same sandbox.
// Each new call checks again, since the sandbox may have stopped between turns
const pending = new Map<string, Promise<Sandbox>>();

const getSandbox = (name: string) => {
  let sandbox = pending.get(name);
  if (!sandbox) {
    sandbox = readySandbox(name).finally(() => pending.delete(name));
    pending.set(name, sandbox);
  }
  return sandbox;
};

// Creates or wakes the sandbox. The turn runs this once before any tool call that needs the
// computer, so parallel calls don't each start it
export const ensureSandbox = async (name: string) => {
  await getSandbox(name);
};

const truncate = (text: string) =>
  text.length > MAX_OUTPUT_CHARS
    ? `[earlier output truncated]\n${text.slice(-MAX_OUTPUT_CHARS)}`
    : text;

// Commands run in a shell session that starts without one of its own; wrap them so pipes,
// redirects and heredocs work
const bash = (command: string) => `bash -c '${command.replaceAll("'", `'\\''`)}'`;

const schemas = {
  runCommand: z.object({
    command: z.string().describe("A bash command or script"),
    timeoutSeconds: z
      .number()
      .int()
      .min(1)
      .max(600)
      .optional()
      .describe("Defaults to 120. For longer jobs, start them in the background and poll"),
  }),
  loadAttachment: z.object({
    attachmentId: z.string().describe("The attachment id shown next to the file in the chat"),
    filename: z.string().describe("The file's name as shown in the chat"),
  }),
  sendFile: z.object({
    path: z.string().describe("Path of the file on your computer"),
    caption: z.string().max(1024).optional().describe("Optional short caption shown with the file"),
  }),
  viewFile: z.object({
    path: z.string().describe("Path of the file on your computer"),
  }),
  computer: z.object({
    action: z.enum([
      "screenshot",
      "click",
      "double_click",
      "right_click",
      "move",
      "drag",
      "scroll",
      "type",
      "key",
    ]),
    x: z.number().int().optional().describe("Target for click, double_click, right_click, move and scroll; start of drag"),
    y: z.number().int().optional(),
    toX: z.number().int().optional().describe("End of drag"),
    toY: z.number().int().optional(),
    text: z.string().optional().describe("Text to type"),
    keys: z.string().optional().describe('Key or combination for key, e.g. "enter", "ctrl+l", "alt+tab"'),
    direction: z.enum(["up", "down"]).optional().describe("Scroll direction"),
    amount: z.number().int().min(1).max(20).optional().describe("Scroll wheel ticks, default 3"),
  }),
};

// Tools without `execute`: the model sees and calls them, and the turn runs each call as its own
// durable step (see chat-turn.ts)
export const computerToolSchemas = {
  runCommand: tool({
    description:
      "Run a bash command on your Linux computer and get its exit code and combined stdout/stderr. The working directory is /home/daytona.",
    inputSchema: schemas.runCommand,
  }),
  loadAttachment: tool({
    description:
      "Copy a file the user sent in the chat onto your computer, into /home/daytona/inbox. Returns its path.",
    inputSchema: schemas.loadAttachment,
  }),
  sendFile: tool({
    description:
      "Send a file from your computer to the user in the chat. Images are shown inline; everything else arrives as a downloadable file.",
    inputSchema: schemas.sendFile,
  }),
  viewFile: tool({
    description:
      "Look at an image (PNG, JPEG, GIF, WebP) or PDF on your computer, for example to check a file you made before sending it.",
    inputSchema: schemas.viewFile,
  }),
  computer: tool({
    description:
      "Operate your computer's graphical desktop (1024x768 pixels). Every action returns a fresh screenshot. Coordinates are pixels from the top-left corner of the screenshot.",
    inputSchema: schemas.computer,
  }),
};

export type ComputerToolName = keyof typeof computerToolSchemas;
export const isComputerTool = (name: string): name is ComputerToolName =>
  Object.hasOwn(computerToolSchemas, name);

// A command runs in the background of a Daytona session. The turn starts it, then checks on it
// between sleeps, so no single request waits on it: a Vercel function would be stopped long before
// a ten minute command finished
export type CommandProgress =
  | { done: true; exitCode: number | null; output: string }
  | { done: false; sessionId: string; commandId: string };

export const COMMAND_DEFAULT_TIMEOUT_SECONDS = 120;
// Commands that finish within this window return from the step that started them
const COMMAND_INLINE_WAIT_MS = 20_000;

export const parseRunCommand = (input: unknown) => {
  const { command, timeoutSeconds = COMMAND_DEFAULT_TIMEOUT_SECONDS } = schemas.runCommand.parse(input);
  return { command, timeoutSeconds };
};

const finishCommand = async (
  sandbox: Sandbox,
  sessionId: string,
  commandId: string,
  exitCode: number | null
): Promise<CommandProgress> => {
  const logs = await sandbox.process.getSessionCommandLogs(sessionId, commandId);
  // The session stays: a retried step reads the same result again, and finished sessions go away
  // with the sandbox
  return {
    done: true,
    exitCode,
    output: truncate(logs.output ?? `${logs.stdout ?? ""}${logs.stderr ?? ""}`),
  };
};

const checkCommand = async (
  sandbox: Sandbox,
  sessionId: string,
  commandId: string
): Promise<CommandProgress> => {
  const { exitCode } = await sandbox.process.getSessionCommand(sessionId, commandId);
  return typeof exitCode === "number"
    ? finishCommand(sandbox, sessionId, commandId, exitCode)
    : { done: false, sessionId, commandId };
};

export const startCommand = async (
  sandboxName: string,
  toolCallId: string,
  command: string
): Promise<CommandProgress> => {
  const sandbox = await getSandbox(sandboxName);
  const sessionId = `cmd-${toolCallId}`;
  // A retried step must not run the command twice: if its session already has the command, it
  // picks that one up
  const existing = await sandbox.process.getSession(sessionId).catch(() => undefined);
  let cmdId = existing?.commands?.[0]?.id;
  if (!cmdId) {
    await sandbox.process.createSession(sessionId).catch(() => {});
    ({ cmdId } = await sandbox.process.executeSessionCommand(sessionId, {
      command: `cd ${HOME} && ${bash(command)}`,
      runAsync: true,
    }));
  }
  if (!cmdId) throw new Error("The sandbox did not return a command id.");

  const deadline = Date.now() + COMMAND_INLINE_WAIT_MS;
  let progress = await checkCommand(sandbox, sessionId, cmdId);
  while (!progress.done && Date.now() < deadline) {
    await sleep(1000);
    progress = await checkCommand(sandbox, sessionId, cmdId);
  }
  return progress;
};

export const pollCommand = async (
  sandboxName: string,
  sessionId: string,
  commandId: string
): Promise<CommandProgress> => checkCommand(await getSandbox(sandboxName), sessionId, commandId);

// Gives up on a command that outlived its timeout: deleting the session ends its processes
export const abandonCommand = async (
  sandboxName: string,
  sessionId: string,
  commandId: string,
  timeoutSeconds: number
): Promise<CommandProgress & { done: true }> => {
  const sandbox = await getSandbox(sandboxName);
  // The command itself isn't logged: it can carry the user's data
  log.warn("Sandbox command timed out", { "sandbox.timeout_s": timeoutSeconds });
  // A retried step finds the session already deleted, and has no output left to show
  const finished = await finishCommand(sandbox, sessionId, commandId, null).catch(() => undefined);
  await sandbox.process.deleteSession(sessionId).catch(() => {});
  const partial = finished?.done ? `\n${finished.output}` : "";
  return { done: true, exitCode: null, output: `Timed out after ${timeoutSeconds} seconds.${partial}` };
};

export type ComputerContext = {
  sandboxName: string;
  channel: Channel;
  chatId: string;
  toolCallId: string;
};

const json = (value: Record<string, unknown>): ToolOutput => ({
  type: "json",
  value: value as never,
});

// A file or screenshot the model should see in the tool result itself. Older ones are replaced by
// a note when the next call is built (see agent-messages.ts), and none reach the stored transcript
const withFile = (text: string, file: { mediaType: string; data: string }): ToolOutput => ({
  type: "content",
  value: [
    { type: "text", text },
    { type: "file", mediaType: file.mediaType, data: { type: "data", data: file.data } },
  ],
});

// Runs every computer tool except runCommand, which is spread over several steps
export const executeComputerTool = async (
  name: Exclude<ComputerToolName, "runCommand">,
  rawInput: unknown,
  { sandboxName, channel, chatId }: ComputerContext
): Promise<ToolOutput> => {
  switch (name) {
    case "loadAttachment": {
      const { attachmentId, filename } = schemas.loadAttachment.parse(rawInput);
      const [sandbox, data] = await Promise.all([
        getSandbox(sandboxName),
        channel.downloadAttachment(attachmentId),
      ]);
      const path = posix.join(HOME, "inbox", posix.basename(filename) || "attachment");
      await sandbox.fs.uploadFile(Buffer.from(data), path);
      return json({ path, bytes: data.byteLength });
    }
    case "sendFile": {
      const { path, caption } = schemas.sendFile.parse(rawInput);
      const sandbox = await getSandbox(sandboxName);
      const fullPath = resolvePath(path);
      const { size, isDir } = await sandbox.fs.getFileDetails(fullPath);
      if (isDir) {
        throw new ToolInputError(`${fullPath} is a directory. Zip it first.`);
      }
      if (size > channel.maxSendBytes) {
        throw new ToolInputError(`${fullPath} is ${size} bytes; the chat accepts at most ${channel.maxSendBytes}.`);
      }
      const data = await sandbox.fs.downloadFile(fullPath);
      const filename = posix.basename(fullPath);
      await channel.sendFile(chatId, { data, filename, mediaType: mediaTypeOf(fullPath) }, caption);
      return json({ sent: filename, bytes: size });
    }
    case "viewFile": {
      const { path } = schemas.viewFile.parse(rawInput);
      const sandbox = await getSandbox(sandboxName);
      const fullPath = resolvePath(path);
      const mediaType = mediaTypeOf(fullPath);
      if (!VIEWABLE.has(mediaType)) {
        throw new ToolInputError("Only PNG, JPEG, GIF, WebP and PDF files can be viewed. Convert it first.");
      }
      const { size } = await sandbox.fs.getFileDetails(fullPath);
      if (size > MAX_VIEW_BYTES) {
        throw new ToolInputError(`${fullPath} is ${size} bytes; shrink it below ${MAX_VIEW_BYTES} first.`);
      }
      const data = await sandbox.fs.downloadFile(fullPath);
      return withFile(JSON.stringify({ path: fullPath, mediaType, bytes: size }), {
        mediaType,
        data: data.toString("base64"),
      });
    }
    case "computer":
      return operateDesktop(schemas.computer.parse(rawInput), await getSandbox(sandboxName));
  }
};

const operateDesktop = async (
  input: z.infer<typeof schemas.computer>,
  sandbox: Sandbox
): Promise<ToolOutput> => {
  const desktop = sandbox.computerUse;
  // The desktop isn't running after the sandbox (re)starts; it takes a moment to draw
  if ((await desktop.getStatus()).status !== "active") {
    await desktop.start();
    await sleep(2000);
  }

  const at = () => {
    if (input.x === undefined || input.y === undefined) {
      throw new ToolInputError(`${input.action} needs x and y.`);
    }
    return [input.x, input.y] as const;
  };

  switch (input.action) {
    case "screenshot":
      break;
    case "click":
      await desktop.mouse.click(...at());
      break;
    case "double_click":
      await desktop.mouse.click(...at(), "left", true);
      break;
    case "right_click":
      await desktop.mouse.click(...at(), "right");
      break;
    case "move":
      await desktop.mouse.move(...at());
      break;
    case "drag":
      if (input.toX === undefined || input.toY === undefined) {
        throw new ToolInputError("drag needs toX and toY.");
      }
      await desktop.mouse.drag(...at(), input.toX, input.toY);
      break;
    case "scroll":
      await desktop.mouse.scroll(...at(), input.direction ?? "down", input.amount ?? 3);
      break;
    case "type":
      if (!input.text) throw new ToolInputError("type needs text.");
      await desktop.keyboard.type(input.text);
      break;
    case "key":
      if (!input.keys) throw new ToolInputError("key needs keys.");
      await (input.keys.includes("+")
        ? desktop.keyboard.hotkey(input.keys)
        : desktop.keyboard.press(input.keys));
      break;
  }

  // Let the UI react before capturing it
  if (input.action !== "screenshot") await sleep(1000);
  const { screenshot, cursorPosition } = await desktop.screenshot.takeCompressed({
    format: "jpeg",
    quality: 60,
  });
  if (!screenshot) throw new Error("The screenshot came back empty.");
  return withFile(JSON.stringify({ action: input.action, cursor: cursorPosition }), {
    mediaType: "image/jpeg",
    data: screenshot,
  });
};

// Neutral names so the model never echoes vendor names back to the user

export const computerToolsInstructions = `
## Your computer

You have your own Linux computer for this conversation. Use it on your own initiative whenever a task needs files, code or apps: editing, filling in, signing, converting or merging documents; making spreadsheets, charts, images or PDFs; crunching data the user sent; or operating a website that needs clicks, forms or logins. Its files stay between messages, but it is wiped after a week without use.

Files the user sends show up in their message with an attachment id. You can read images and PDFs directly in the message. To work on any attached file, copy it onto the computer with loadAttachment first.

How to work:
1. Prefer runCommand with scripts over the desktop. Python 3 with pypdf and Pillow is installed; pip install anything else you need (for example reportlab or pymupdf). Write scripts to files with heredocs and run them.
2. Check your output before sending it. For a document, render the pages you changed to PNG (pymupdf works well) and look at them with viewFile.
3. Deliver files with sendFile, using a clear filename such as rental-agreement-signed.pdf. sendFile is the only way to give the user a file: never claim a file is attached unless sendFile succeeded, and don't paste a file's raw contents into the chat instead.
4. Use the computer tool only when a task needs a graphical app or a website you must click through. Start apps from runCommand in the background, for example: DISPLAY=:0 nohup chromium --no-sandbox --no-first-run URL >/dev/null 2>&1 &
5. For jobs over a couple of minutes, run them in the background with nohup and check on them.
6. If you can't load the user's file or can't send yours, stop and tell the user. Never recreate their document from its text as a substitute: a rebuilt copy can differ from the original in ways they won't notice.

When you're done, reply with one or two short lines about what you did. The file itself is already in the chat.

Never mention your tools, the computer's vendor, sandboxes or file paths unless the user asks. To the user you simply made or edited the file.
`.trim();
