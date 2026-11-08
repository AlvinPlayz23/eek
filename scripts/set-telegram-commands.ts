import { setMyCommands } from "../src/inngest/telegram-api.js";
import { TELEGRAM_COMMANDS } from "../src/telegram-commands.js";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set");
}

await setMyCommands(TELEGRAM_COMMANDS);
console.log(`Registered ${TELEGRAM_COMMANDS.length} Telegram command(s).`);
