import {
  MAX_REMINDER_ATTEMPTS,
  claimDueReminders,
  claimReminder,
  markReminderSent,
  recordReminderFailure,
  skipReminderOccurrence,
} from "../db/reminders.js";
import type { Reminder } from "../db/schema.js";
import { log } from "../log.js";
import { CHANNELS } from "./channels.js";
import { inngest } from "./client.js";
import { reminderDue } from "./events.js";
import { reportFailure } from "./failure.js";
import { scheduleReminderEvent } from "./reminder-events.js";
import { nextOccurrence } from "./reminder-schedule.js";

const BATCH_SIZE = 50;

type DeliveryResult = {
  status: "sent" | "failed" | "skipped";
  nextDueAt: string | null;
};

// Step results are JSON-serialized. Delivery only needs these fields; the dates are not used here
type ClaimedReminder = Pick<
  Reminder,
  "id" | "platform" | "chatId" | "text" | "attempts" | "rrule" | "timezone"
>;

const scheduleNext = async (reminder: Pick<Reminder, "id">, nextDueAt: Date) => {
  try {
    await scheduleReminderEvent({ id: reminder.id, dueAt: nextDueAt });
    return true;
  } catch (error) {
    // The fallback sweep delivers the next occurrence if its event is missing. Scheduling is
    // deliberately not a separate step: one reminder occurrence should stay at three executions
    log.error("Could not schedule next reminder occurrence", {
      "reminder.id": reminder.id,
      "error.name": error instanceof Error ? error.name : "unknown",
    });
    return false;
  }
};

const deliverClaimedReminder = async (
  reminder: ClaimedReminder,
  dueAt: Date
): Promise<DeliveryResult> => {
  // If the event fires a little early, the next occurrence must still be after this one. If
  // delivery is late, skip occurrences that already passed
  const after = new Date(Math.max(Date.now(), dueAt.getTime()));
  try {
    await CHANNELS[reminder.platform].sendText(reminder.chatId, `Reminder: ${reminder.text}`);
  } catch (error) {
    const attempts = reminder.attempts + 1;
    const final = attempts >= MAX_REMINDER_ATTEMPTS;
    if (final && reminder.rrule) {
      const next = nextOccurrence(reminder.rrule, reminder.timezone, after);
      if (next) {
        await skipReminderOccurrence(reminder.id, next);
        await scheduleNext(reminder, next);
        log.error("Reminder occurrence skipped after repeated failures", {
          "reminder.id": reminder.id,
          "reminder.attempts": attempts,
          "channel.platform": reminder.platform,
          "error.name": error instanceof Error ? error.name : "unknown",
        });
        return { status: "failed", nextDueAt: next.toISOString() };
      }
    }

    await recordReminderFailure(reminder.id, attempts);
    const fields = {
      "reminder.id": reminder.id,
      "reminder.attempts": attempts,
      "channel.platform": reminder.platform,
      "error.name": error instanceof Error ? error.name : "unknown",
    };
    if (final) log.error("Reminder delivery abandoned", fields);
    else log.warn("Reminder delivery failed", fields);
    return { status: "failed", nextDueAt: null };
  }

  const next = reminder.rrule
    ? nextOccurrence(reminder.rrule, reminder.timezone, after)
    : null;
  await markReminderSent(reminder.id, next);
  if (next) await scheduleNext(reminder, next);
  log.info("Reminder delivered", {
    "reminder.id": reminder.id,
    "reminder.recurring": Boolean(reminder.rrule),
    "channel.platform": reminder.platform,
  });
  return { status: "sent", nextDueAt: next?.toISOString() ?? null };
};

// The normal delivery path: Inngest holds one delayed event per occurrence and starts this
// function only when it is due. Three executions per occurrence: run, claim, deliver
export const deliverReminder = inngest.createFunction(
  {
    id: "deliver-reminder",
    triggers: [reminderDue],
    retries: 2,
    onFailure: async ({ error, event }) => {
      await reportFailure(error, {
        function: "deliver-reminder",
        runId: event.data.run_id,
      });
    },
  },
  async ({ event, step }) => {
    const scheduledFor = new Date(event.data.scheduledFor);
    if (Number.isNaN(scheduledFor.getTime())) return { status: "skipped" as const };

    const reminder = await step.run("claim", () =>
      claimReminder(event.data.reminderId, scheduledFor)
    );
    if (!reminder) return { status: "skipped" as const };

    return step.run("deliver", () => deliverClaimedReminder(reminder, scheduledFor));
  }
);

// Safety net for a missing delayed event or a recurring occurrence whose next event was not
// scheduled. It only wakes once an hour; the normal path above is event-driven
export const sweepReminders = inngest.createFunction(
  {
    id: "sweep-reminders",
    triggers: { cron: "0 * * * *" },
    retries: 2,
    onFailure: async ({ error, event }) => {
      await reportFailure(error, { function: "sweep-reminders", runId: event.data.run_id });
    },
  },
  async ({ step }) => {
    const due = await step.run("claim-reminders", () => claimDueReminders(BATCH_SIZE));
    const results: DeliveryResult[] = [];
    for (const reminder of due) {
      const dueAt = new Date(reminder.dueAt);
      results.push(
        await step.run(`deliver-${reminder.id}`, () => deliverClaimedReminder(reminder, dueAt))
      );
    }
    return {
      delivered: results.filter((result) => result.status === "sent").length,
      failed: results.filter((result) => result.status === "failed").length,
      skipped: results.filter((result) => result.status === "skipped").length,
    };
  }
);
