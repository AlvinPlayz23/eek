import { tool } from "ai";
import { z } from "zod";
import { loadProfile, saveTimezone } from "../db/profiles.js";
import {
  MAX_PENDING_REMINDERS,
  cancelReminder,
  countActiveReminders,
  insertReminder,
  listUserReminders,
  loadReminderByDedupeKey,
  loadUserReminder,
  pauseReminder as pauseReminderRow,
  resumeReminder as resumeReminderRow,
  updateReminder,
} from "../db/reminders.js";
import type { Platform } from "../db/schema.js";
import { log } from "../log.js";
import { ToolInputError, type ToolOutput } from "./computer-tools.js";
import { scheduleReminderEvent } from "./reminder-events.js";
import {
  REPEAT_FREQUENCIES,
  buildReminderSchedule,
  formatInZone,
  isValidTimeZone,
  nextResumeDueAt,
  repeatFromRRule,
  repeatToText,
} from "./reminder-schedule.js";

const offsetDateTime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/,
    "Use an ISO 8601 timestamp with a timezone offset, e.g. 2026-11-10T09:00:00+03:00."
  )
  .refine((value) => !Number.isNaN(Date.parse(value)), "That date is not valid.");

const reminderId = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Use a reminder id from listReminders.");

const repeatSchema = z
  .object({
    frequency: z.enum(REPEAT_FREQUENCIES),
    interval: z
      .number()
      .int()
      .min(1)
      .max(52)
      .optional()
      .describe("Every N periods; defaults to 1"),
    weekdays: z
      .array(z.number().int().min(0).max(6))
      .min(1)
      .max(7)
      .optional()
      .describe("Only for weekly repeats. 0 = Sunday ... 6 = Saturday"),
    dayOfMonth: z
      .number()
      .int()
      .min(1)
      .max(31)
      .optional()
      .describe("Only for monthly repeats"),
  })
  .describe("Omit for a one-off reminder");

export const schemas = {
  setTimezone: z.object({
    timezone: z
      .string()
      .min(1)
      .max(100)
      .describe("IANA timezone, e.g. Europe/London or America/New_York"),
  }),
  setReminder: z.object({
    text: z.string().min(1).max(1000).describe("Short reminder text, in the user's words"),
    dueAt: offsetDateTime.describe(
      "The first occurrence as an ISO 8601 timestamp with an explicit offset in the user's timezone"
    ),
    repeat: repeatSchema.optional(),
  }),
  editReminder: z.object({
    id: reminderId.describe("The reminder id from listReminders"),
    text: z.string().min(1).max(1000).optional().describe("The new text, if it changes"),
    dueAt: offsetDateTime
      .optional()
      .describe("The new next occurrence, if it changes, in the user's timezone"),
    repeat: repeatSchema
      .nullable()
      .optional()
      .describe("The new repeat. Null makes it a one-off; omit to keep the current schedule"),
  }),
  listReminders: z.object({}),
  pauseReminder: z.object({
    id: reminderId.describe("The reminder id from listReminders"),
  }),
  resumeReminder: z.object({
    id: reminderId.describe("The reminder id from listReminders"),
  }),
  cancelReminder: z.object({
    id: reminderId.describe("The reminder id from listReminders"),
  }),
};

export const reminderToolSchemas = {
  setTimezone: tool({
    description:
      "Save the user's IANA timezone so reminders are scheduled in their local time. Ask for their city or timezone first if you don't know it.",
    inputSchema: schemas.setTimezone,
  }),
  setReminder: tool({
    description:
      "Create a one-off or recurring reminder. The app sends it to this chat at the scheduled time, even after the conversation ends.",
    inputSchema: schemas.setReminder,
  }),
  editReminder: tool({
    description:
      "Change the text, next time or repeat of one existing reminder without losing it. Omit a field to leave it as it is; pass repeat: null to make a recurring reminder a one-off.",
    inputSchema: schemas.editReminder,
  }),
  listReminders: tool({
    description: "List the user's active reminders, upcoming and paused, soonest first.",
    inputSchema: schemas.listReminders,
  }),
  pauseReminder: tool({
    description:
      "Pause one reminder or recurring series. It keeps its next occurrence and can be resumed later.",
    inputSchema: schemas.pauseReminder,
  }),
  resumeReminder: tool({
    description: "Resume one paused reminder. If its next occurrence has passed, it is rescheduled.",
    inputSchema: schemas.resumeReminder,
  }),
  cancelReminder: tool({
    description: "Cancel one active or paused reminder or recurring reminder series.",
    inputSchema: schemas.cancelReminder,
  }),
};

export type ReminderToolName = keyof typeof reminderToolSchemas;

export const isReminderTool = (name: string): name is ReminderToolName =>
  Object.hasOwn(reminderToolSchemas, name);

export type ReminderContext = {
  clerkUserId: string;
  platform: Platform;
  chatId: string;
  toolCallId: string;
};

const json = (value: Record<string, unknown>): ToolOutput => ({
  type: "json",
  value: value as never,
});

const requireTimezone = async (clerkUserId: string) => {
  const profile = await loadProfile(clerkUserId);
  if (!profile?.timezone || !isValidTimeZone(profile.timezone)) {
    throw new ToolInputError(
      "The user's timezone is not set. Ask which city or timezone they are in, then call setTimezone."
    );
  }
  return profile.timezone;
};

const localTime = (date: Date, timeZone: string) =>
  formatInZone(date, timeZone, { dateStyle: "full", timeStyle: "short" });

export const executeReminderTool = async (
  name: ReminderToolName,
  rawInput: unknown,
  context: ReminderContext
): Promise<ToolOutput> => {
  switch (name) {
    case "setTimezone": {
      const parsed = schemas.setTimezone.safeParse(rawInput);
      if (!parsed.success) {
        throw new ToolInputError(parsed.error.issues[0]?.message ?? "Invalid timezone.");
      }
      const { timezone } = parsed.data;
      if (!isValidTimeZone(timezone)) {
        throw new ToolInputError(
          "That is not a valid IANA timezone. Use a name like Europe/London or America/New_York."
        );
      }
      await saveTimezone(context.clerkUserId, timezone);
      return json({
        timezone,
        localTime: formatInZone(new Date(), timezone, {
          dateStyle: "full",
          timeStyle: "long",
        }),
      });
    }
    case "setReminder": {
      const parsed = schemas.setReminder.safeParse(rawInput);
      if (!parsed.success) {
        throw new ToolInputError(parsed.error.issues[0]?.message ?? "Invalid reminder.");
      }
      const input = parsed.data;
      const text = input.text.trim();
      if (!text) throw new ToolInputError("The reminder text is empty.");
      const timezone = await requireTimezone(context.clerkUserId);
      const dueAt = new Date(input.dueAt);
      if (dueAt.getTime() < Date.now() - 60_000) {
        throw new ToolInputError("The reminder time is in the past. Choose a future date and time.");
      }

      let schedule: ReturnType<typeof buildReminderSchedule>;
      try {
        schedule = buildReminderSchedule(dueAt, timezone, input.repeat);
      } catch (error) {
        if (error instanceof ToolInputError) throw error;
        throw new ToolInputError("That repeat is not valid.");
      }
      if (schedule.dueAt.getTime() < Date.now() - 60_000) {
        throw new ToolInputError("The reminder time is in the past. Choose a future date and time.");
      }

      const dedupeKey = `${context.platform}:${context.chatId}:${context.toolCallId}`;
      let reminder = await loadReminderByDedupeKey(dedupeKey);
      if (!reminder) {
        const active = await countActiveReminders(context.clerkUserId);
        if (active >= MAX_PENDING_REMINDERS) {
          throw new ToolInputError(
            `The user already has ${MAX_PENDING_REMINDERS} active reminders. Cancel one first.`
          );
        }
        reminder = await insertReminder({
          clerkUserId: context.clerkUserId,
          platform: context.platform,
          chatId: context.chatId,
          dedupeKey,
          text,
          dueAt: schedule.dueAt,
          rrule: schedule.rrule,
          timezone,
        });
      }

      // If this fails, the reminder is still stored and the hourly sweep will deliver it. The
      // idempotent event id means a retried tool step cannot schedule it twice
      try {
        await scheduleReminderEvent(reminder);
      } catch (error) {
        log.error("Reminder created but its due event was not scheduled", {
          "reminder.id": reminder.id,
          "error.name": error instanceof Error ? error.name : "unknown",
        });
      }

      return json({
        id: reminder.id,
        text: reminder.text,
        dueAt: reminder.dueAt.toISOString(),
        localTime: localTime(reminder.dueAt, reminder.timezone),
        timezone: reminder.timezone,
        repeats: reminder.rrule ? repeatToText(reminder.rrule) : null,
      });
    }
    case "editReminder": {
      const parsed = schemas.editReminder.safeParse(rawInput);
      if (!parsed.success) {
        throw new ToolInputError(parsed.error.issues[0]?.message ?? "Invalid reminder.");
      }
      const input = parsed.data;
      const reminder = await loadUserReminder(context.clerkUserId, input.id);
      if (!reminder || (reminder.status !== "pending" && reminder.status !== "paused")) {
        throw new ToolInputError(
          "No active reminder has that id. Use listReminders to see the current reminders."
        );
      }

      const text = input.text?.trim() ?? reminder.text;
      if (!text) throw new ToolInputError("The reminder text is empty.");
      let dueAt = reminder.dueAt;
      let rrule = reminder.rrule;
      if (input.dueAt) {
        dueAt = new Date(input.dueAt);
        if (dueAt.getTime() < Date.now() - 60_000) {
          throw new ToolInputError("The reminder time is in the past. Choose a future date and time.");
        }
      }

      if (input.repeat !== undefined) {
        const schedule = buildReminderSchedule(dueAt, reminder.timezone, input.repeat ?? undefined);
        dueAt = schedule.dueAt;
        rrule = schedule.rrule;
      } else if (input.dueAt && reminder.rrule) {
        // The rule carries its DTSTART, so moving the next occurrence rebuilds it at the new time
        const repeat = repeatFromRRule(reminder.rrule);
        if (repeat) {
          const schedule = buildReminderSchedule(dueAt, reminder.timezone, repeat);
          dueAt = schedule.dueAt;
          rrule = schedule.rrule;
        }
      }
      if (dueAt.getTime() < Date.now() - 60_000) {
        throw new ToolInputError("The reminder time is in the past. Choose a future date and time.");
      }

      const updated = await updateReminder(context.clerkUserId, reminder.id, {
        text,
        dueAt,
        rrule,
        timezone: reminder.timezone,
      });
      if (!updated) {
        throw new ToolInputError("That reminder changed in the meantime. Use listReminders again.");
      }
      if (updated.status === "pending") {
        await scheduleReminderEvent(updated, `edited-${Date.now()}`).catch((error) => {
          log.error("Reminder edited but its due event was not rescheduled", {
            "reminder.id": updated.id,
            "error.name": error instanceof Error ? error.name : "unknown",
          });
        });
      }
      return json({
        id: updated.id,
        text: updated.text,
        dueAt: updated.dueAt.toISOString(),
        localTime: localTime(updated.dueAt, updated.timezone),
        timezone: updated.timezone,
        repeats: updated.rrule ? repeatToText(updated.rrule) : null,
        paused: updated.status === "paused",
      });
    }
    case "pauseReminder": {
      const parsed = schemas.pauseReminder.safeParse(rawInput);
      if (!parsed.success) {
        throw new ToolInputError(parsed.error.issues[0]?.message ?? "Invalid reminder id.");
      }
      const reminder = await pauseReminderRow(context.clerkUserId, parsed.data.id);
      if (!reminder) {
        throw new ToolInputError(
          "No active reminder has that id. Use listReminders to see the current reminders."
        );
      }
      return json({
        id: reminder.id,
        paused: true,
        nextDueAt: reminder.dueAt.toISOString(),
        localTime: localTime(reminder.dueAt, reminder.timezone),
      });
    }
    case "resumeReminder": {
      const parsed = schemas.resumeReminder.safeParse(rawInput);
      if (!parsed.success) {
        throw new ToolInputError(parsed.error.issues[0]?.message ?? "Invalid reminder id.");
      }
      const reminder = await loadUserReminder(context.clerkUserId, parsed.data.id);
      if (!reminder || reminder.status !== "paused") {
        throw new ToolInputError(
          "That reminder is not paused. Use listReminders to see the current reminders."
        );
      }
      const resumed = await resumeReminderRow(
        context.clerkUserId,
        reminder.id,
        nextResumeDueAt(reminder)
      );
      if (!resumed) {
        throw new ToolInputError("That reminder changed in the meantime. Use listReminders again.");
      }
      await scheduleReminderEvent(resumed, `resumed-${Date.now()}`).catch((error) => {
        log.error("Reminder resumed but its due event was not scheduled", {
          "reminder.id": resumed.id,
          "error.name": error instanceof Error ? error.name : "unknown",
        });
      });
      return json({
        id: resumed.id,
        paused: false,
        dueAt: resumed.dueAt.toISOString(),
        localTime: localTime(resumed.dueAt, resumed.timezone),
        repeats: resumed.rrule ? repeatToText(resumed.rrule) : null,
      });
    }
    case "listReminders": {
      const parsed = schemas.listReminders.safeParse(rawInput);
      if (!parsed.success) {
        throw new ToolInputError("Invalid request.");
      }
      const rows = await listUserReminders(context.clerkUserId, ["pending", "paused"]);
      return json({
        reminders: rows.map((reminder) => ({
          id: reminder.id,
          text: reminder.text,
          dueAt: reminder.dueAt.toISOString(),
          localTime: localTime(reminder.dueAt, reminder.timezone),
          timezone: reminder.timezone,
          repeats: reminder.rrule ? repeatToText(reminder.rrule) : null,
          paused: reminder.status === "paused",
        })),
      });
    }
    case "cancelReminder": {
      const parsed = schemas.cancelReminder.safeParse(rawInput);
      if (!parsed.success) {
        throw new ToolInputError(parsed.error.issues[0]?.message ?? "Invalid reminder id.");
      }
      const canceled = await cancelReminder(context.clerkUserId, parsed.data.id);
      if (!canceled) {
        throw new ToolInputError(
          "No active reminder has that id. Use listReminders to see the current reminders."
        );
      }
      return json({ canceled: true, id: parsed.data.id });
    }
  }
};

export const reminderToolsInstructions = `
## Reminders

You can create, edit, pause, resume, list and cancel reminders, including recurring ones. The app delivers them to the chat where they were created, even after the conversation ends. The user can also manage them on the web dashboard.

- Before scheduling, make sure you know the user's IANA timezone. If the system prompt says it is unknown, ask for their city or timezone and call setTimezone first.
- setReminder takes the first occurrence as an ISO 8601 timestamp with an explicit UTC offset, expressed in the user's local time. For example, 2026-11-10T09:00:00+03:00.
- For a recurring reminder, pass repeat. frequency is daily, weekly, monthly or yearly; interval means every N periods; weekdays (0 = Sunday ... 6 = Saturday) is for weekly schedules; dayOfMonth is for monthly schedules. Every weekday is weekly with weekdays [1,2,3,4,5].
- Omit repeat for a one-off reminder. If the first date does not match the repeat (for example a Tuesday for a Monday/Wednesday schedule), the first matching occurrence is used.
- To change a reminder, list it and call editReminder with its id: change text, dueAt or repeat. Omit what stays the same; pass repeat: null to turn a recurring reminder into a one-off. Use editReminder rather than canceling and recreating. Never guess an id: list first.
- pauseReminder stops delivery and keeps the series; resumeReminder starts it again. If the paused occurrence has passed, resuming moves to the next one, or sends an overdue one-off right away.
- cancelReminder ends the series for good.
- When confirming, state the local date, time and repeat in plain language. Don't show ids unless the user asks.
- If the user asks what reminders they have, list them and mention the next occurrence and paused state of each.
`.trim();
