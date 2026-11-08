// Telegram sends commands as ordinary messages: "/help", "/help@BotName" or "/help with args".
// Only commands the webhook knows are intercepted; everything else still reaches the agent
export type ParsedTelegramCommand = {
  name: string;
  args: string;
};

// A command name is 1-32 letters, digits or underscores; a bot mention may follow it
const COMMAND = /^\/([a-z0-9_]{1,32})(?:@[a-z0-9_]+)?(?:\s+([\s\S]*))?$/i;

export const parseTelegramCommand = (text: string | undefined): ParsedTelegramCommand | null => {
  if (!text) return null;
  const match = COMMAND.exec(text.trim());
  if (!match) return null;
  return { name: match[1]!.toLowerCase(), args: (match[2] ?? "").trim() };
};

export const HELP_TEXT = [
  "I'm your personal assistant.",
  "",
  "Send me a message, a photo, or a document. I can look things up on the web, read and create files, and handle tasks that need a computer.",
  "",
  "Commands:",
  "/help — show this message",
  "/whoami — show your account and plan",
].join("\n");

export const WHOAMI_NOT_LINKED_TEXT =
  "You're not connected to an account yet. Send me any message to get a sign-in link.";

// `pro` is null when the plan lookup failed: the link is still known, so show what we can.
// `email` is omitted when Clerk didn't return one
export const whoamiText = ({
  email,
  pro,
  linkedAt,
  upgradeUrl,
}: {
  email?: string | null;
  pro: boolean | null;
  linkedAt: Date;
  upgradeUrl: string;
}) =>
  [
    "You're connected.",
    "",
    ...(email ? [`Email: ${email}`] : []),
    `Plan: ${pro === null ? "couldn't check right now" : pro ? "Pro" : "No active Pro subscription"}`,
    `Linked since: ${linkedAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    })}`,
    ...(pro === false ? ["", `Upgrade here: ${upgradeUrl}`] : []),
  ].join("\n");

// Shown in Telegram's command menu. Keep it in sync with the commands the webhook handles
export const TELEGRAM_COMMANDS = [
  { command: "help", description: "Show what I can do" },
  { command: "whoami", description: "Show your account and plan" },
];
