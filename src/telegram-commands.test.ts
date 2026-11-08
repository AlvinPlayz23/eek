import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { HELP_TEXT, parseTelegramCommand, whoamiText } from "./telegram-commands.js";

describe("telegram commands", () => {
  test("parses a command, its bot mention and arguments", () => {
    assert.deepEqual(parseTelegramCommand("/help"), { name: "help", args: "" });
    assert.deepEqual(parseTelegramCommand("/HELP@MyBot"), { name: "help", args: "" });
    assert.deepEqual(parseTelegramCommand("/help with this"), {
      name: "help",
      args: "with this",
    });
  });

  test("ignores ordinary messages", () => {
    assert.equal(parseTelegramCommand("hello"), null);
    assert.equal(parseTelegramCommand("/usr/bin/env"), null);
    assert.equal(parseTelegramCommand(undefined), null);
  });

  test("help text lists the commands", () => {
    assert.match(HELP_TEXT, /\/help/);
    assert.match(HELP_TEXT, /\/whoami/);
  });

  test("whoami reports the email, plan and linked date", () => {
    const linkedAt = new Date("2026-11-07T12:00:00Z");
    const pro = whoamiText({
      email: "joe@example.com",
      pro: true,
      linkedAt,
      upgradeUrl: "https://upgrade.example",
    });
    assert.match(pro, /Email: joe@example\.com/);
    assert.match(pro, /Plan: Pro/);
    assert.match(pro, /Linked since: November 7, 2026/);
    assert.doesNotMatch(pro, /Upgrade here/);

    const free = whoamiText({ pro: false, linkedAt, upgradeUrl: "https://upgrade.example" });
    assert.doesNotMatch(free, /Email:/);
    assert.match(free, /No active Pro subscription/);
    assert.match(free, /Upgrade here: https:\/\/upgrade\.example/);
  });
});
