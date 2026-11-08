import assert from "node:assert/strict";
import { InngestTestEngine } from "@inngest/test";
import { eq } from "drizzle-orm";
import { db } from "../src/db/index.js";
import { loadProfile, saveTimezone } from "../src/db/profiles.js";
import {
  claimDueReminders,
  claimReminder,
  insertReminder,
  listPendingReminders,
  loadReminder,
  markReminderSent,
} from "../src/db/reminders.js";
import { reminders, userProfiles } from "../src/db/schema.js";
import { CHANNELS } from "../src/inngest/channels.js";
import { executeReminderTool } from "../src/inngest/reminder-tools.js";
import { deliverReminder, sweepReminders } from "../src/inngest/reminders.js";

const clerkUserId = `test-reminders-${Date.now()}`;
const context = {
  clerkUserId,
  platform: "telegram" as const,
  chatId: "test-chat",
  toolCallId: `test-tool-${Date.now()}`,
};
const originalSend = CHANNELS.telegram.sendText;
let exitCode = 0;

try {
  await saveTimezone(clerkUserId, "Europe/London");
  assert.equal((await loadProfile(clerkUserId))?.timezone, "Europe/London");

  const created = await executeReminderTool(
    "setReminder",
    {
      text: "Test reminder",
      dueAt: "2026-11-10T09:00:00Z",
      repeat: { frequency: "weekly", weekdays: [1, 3] },
    },
    context
  );
  const createdValue = (created as { value: { id: string; localTime: string; repeats: string } }).value;
  assert.match(createdValue.localTime, /Wednesday, 11 November 2026/);
  assert.match(createdValue.repeats, /Monday, Wednesday/);

  // A retried tool step reuses the reminder instead of creating a second one
  const retried = await executeReminderTool(
    "setReminder",
    {
      text: "Test reminder",
      dueAt: "2026-11-10T09:00:00Z",
      repeat: { frequency: "weekly", weekdays: [1, 3] },
    },
    context
  );
  assert.equal((retried as { value: { id: string } }).value.id, createdValue.id);

  const listed = await executeReminderTool("listReminders", {}, context);
  const listedValue = (listed as { value: { reminders: unknown[] } }).value;
  assert.equal(listedValue.reminders.length, 1);

  const canceled = await executeReminderTool(
    "cancelReminder",
    { id: createdValue.id },
    context
  );
  assert.deepEqual((canceled as { value: unknown }).value, {
    canceled: true,
    id: createdValue.id,
  });
  assert.equal((await listPendingReminders(clerkUserId)).length, 0);

  // Exercise the delivery claim and completion path with a due one-off row
  const row = await insertReminder({
    clerkUserId,
    platform: "telegram",
    chatId: "test-chat",
    text: "Claim test",
    dueAt: new Date(Date.now() - 60_000),
    rrule: null,
    timezone: "Europe/London",
  });
  const claimed = await claimDueReminders(100);
  assert.ok(claimed.some((reminder) => reminder.id === row.id));
  await markReminderSent(row.id, null);
  assert.equal((await loadReminder(row.id))?.status, "sent");

  // The delayed event claims only the occurrence it was scheduled for
  const occurrence = await insertReminder({
    clerkUserId,
    platform: "telegram",
    chatId: "test-chat",
    text: "Occurrence claim test",
    dueAt: new Date(Date.now() + 60_000),
    rrule: null,
    timezone: "Europe/London",
  });
  assert.equal(await claimReminder(occurrence.id, new Date(occurrence.dueAt.getTime() + 1)), null);
  assert.equal((await claimReminder(occurrence.id, occurrence.dueAt))?.id, occurrence.id);

  // Run the event-triggered function itself against the database and a fake channel
  const sent: string[] = [];
  CHANNELS.telegram.sendText = async (_chatId, text) => {
    sent.push(text);
  };
  const delivery = await insertReminder({
    clerkUserId,
    platform: "telegram",
    chatId: "test-chat",
    text: "Delivery test",
    dueAt: new Date(Date.now() - 1_000),
    rrule: null,
    timezone: "Europe/London",
  });
  const engine = new InngestTestEngine({ function: deliverReminder });
  const { error } = await engine.execute({
    events: [
      {
        name: "reminder/due",
        data: { reminderId: delivery.id, scheduledFor: delivery.dueAt.toISOString() },
      } as never,
    ],
  });
  assert.equal(error, undefined);
  assert.deepEqual(sent, ["Reminder: Delivery test"]);
  assert.equal((await loadReminder(delivery.id))?.status, "sent");

  // The hourly fallback picks up a due reminder that has no delayed event
  const fallback = await insertReminder({
    clerkUserId,
    platform: "telegram",
    chatId: "test-chat",
    text: "Fallback test",
    dueAt: new Date(Date.now() - 1_000),
    rrule: null,
    timezone: "Europe/London",
  });
  const fallbackSent: string[] = [];
  CHANNELS.telegram.sendText = async (_chatId, text) => {
    fallbackSent.push(text);
  };
  const sweepEngine = new InngestTestEngine({ function: sweepReminders });
  const { error: sweepError } = await sweepEngine.execute();
  assert.equal(sweepError, undefined);
  assert.deepEqual(fallbackSent, ["Reminder: Fallback test"]);
  assert.equal((await loadReminder(fallback.id))?.status, "sent");

  console.log("Reminder database, tool, delivery and fallback checks passed.");
} catch (error) {
  console.error(error);
  exitCode = 1;
} finally {
  CHANNELS.telegram.sendText = originalSend;
  await db.delete(reminders).where(eq(reminders.clerkUserId, clerkUserId));
  await db.delete(userProfiles).where(eq(userProfiles.clerkUserId, clerkUserId));
  process.exit(exitCode);
}
