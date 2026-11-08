import { createRequire } from "node:module";
import type { Options } from "rrule";
import type { Reminder } from "../db/schema.js";
import { ToolInputError } from "./computer-tools.js";

// rrule ships CommonJS. tsx and plain Node expose its exports differently, so load it through
// require: the compiled app runs as ESM, where a named import would fail
const require = createRequire(import.meta.url);
const { RRule, Weekday } = require("rrule") as typeof import("rrule");

export const REPEAT_FREQUENCIES = ["daily", "weekly", "monthly", "yearly"] as const;
export type RepeatFrequency = (typeof REPEAT_FREQUENCIES)[number];

export type ReminderRepeat = {
  frequency: RepeatFrequency;
  // Every N days/weeks/months/years
  interval?: number;
  // 0 = Sunday ... 6 = Saturday, only for weekly repeats
  weekdays?: number[];
  // Only for monthly repeats
  dayOfMonth?: number;
};

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const formatters = new Map<string, Intl.DateTimeFormat>();

const formatterFor = (timeZone: string) => {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
};

export const isValidTimeZone = (timeZone: string): boolean => {
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
};

export const zonedParts = (date: Date, timeZone: string): ZonedParts => {
  const values: Record<string, string> = {};
  for (const part of formatterFor(timeZone).formatToParts(date)) {
    if (part.type !== "literal") values[part.type] = part.value;
  }
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
};

const utcParts = (date: Date): ZonedParts => ({
  year: date.getUTCFullYear(),
  month: date.getUTCMonth() + 1,
  day: date.getUTCDate(),
  hour: date.getUTCHours(),
  minute: date.getUTCMinutes(),
  second: date.getUTCSeconds(),
});

// How far the zone is from UTC at that instant. Two iterations are enough outside a DST switch;
// the extra one settles a wall time close to the switch
const offsetAt = (date: Date, timeZone: string): number => {
  const parts = zonedParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return asUtc - (date.getTime() - date.getMilliseconds());
};

export const wallTimeToDate = (parts: ZonedParts, timeZone: string): Date => {
  const target = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  let timestamp = target;
  for (let i = 0; i < 4; i++) {
    const adjusted = target - offsetAt(new Date(timestamp), timeZone);
    if (adjusted === timestamp) break;
    timestamp = adjusted;
  }
  return new Date(timestamp);
};

export const formatInZone = (
  date: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }
): string => new Intl.DateTimeFormat("en-GB", { timeZone, ...options }).format(date);

const FREQUENCIES: Record<RepeatFrequency, number> = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
  yearly: RRule.YEARLY,
};

// The model uses JavaScript's weekday numbering (0 = Sunday); rrule has its own Weekday objects
const WEEKDAYS = [RRule.SU, RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA];

// The rule is kept in a floating timeline: its dates carry the user's wall-clock time, not a UTC
// instant. nextOccurrence converts the wall time back to a real instant in the stored timezone, so
// a 09:00 reminder stays at 09:00 across DST changes
export const buildReminderSchedule = (
  dueAt: Date,
  timeZone: string,
  repeat?: ReminderRepeat
): { dueAt: Date; rrule: string | null } => {
  if (!repeat) return { dueAt, rrule: null };

  if (repeat.weekdays && repeat.frequency !== "weekly") {
    throw new ToolInputError("weekdays only applies to weekly repeats.");
  }
  if (repeat.dayOfMonth && repeat.frequency !== "monthly") {
    throw new ToolInputError("dayOfMonth only applies to monthly repeats.");
  }
  if (repeat.interval !== undefined && repeat.interval < 1) {
    throw new ToolInputError("The repeat interval must be at least 1.");
  }
  if (repeat.weekdays?.some((day) => day < 0 || day > 6)) {
    throw new ToolInputError("weekdays must be between 0 (Sunday) and 6 (Saturday).");
  }
  if (repeat.dayOfMonth !== undefined && (repeat.dayOfMonth < 1 || repeat.dayOfMonth > 31)) {
    throw new ToolInputError("dayOfMonth must be between 1 and 31.");
  }

  const local = zonedParts(dueAt, timeZone);
  const floatingStart = new Date(
    Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second)
  );
  const options: Partial<Options> = {
    freq: FREQUENCIES[repeat.frequency],
    interval: repeat.interval ?? 1,
    dtstart: floatingStart,
  };
  if (repeat.frequency === "weekly" && repeat.weekdays?.length) {
    options.byweekday = [...new Set(repeat.weekdays)].map((day) => WEEKDAYS[day]!);
  }
  if (repeat.frequency === "monthly" && repeat.dayOfMonth) {
    options.bymonthday = repeat.dayOfMonth;
  }

  const rule = new RRule(options);
  // A first date that doesn't match the rule (a Tuesday for a Mon/Wed repeat) still means the
  // first matching occurrence, not a reminder on the wrong day
  const firstFloating = rule.after(new Date(floatingStart.getTime() - 1), true);
  if (!firstFloating) throw new ToolInputError("That repeat never produces an occurrence.");

  return {
    dueAt: wallTimeToDate(utcParts(firstFloating), timeZone),
    rrule: rule.toString(),
  };
};

export const nextOccurrence = (
  rruleText: string,
  timeZone: string,
  after: Date
): Date | null => {
  const rule = RRule.fromString(rruleText);
  const local = zonedParts(after, timeZone);
  const floatingNow = new Date(
    Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second, after.getMilliseconds())
  );
  const nextFloating = rule.after(floatingNow, false);
  if (!nextFloating) return null;
  return wallTimeToDate(utcParts(nextFloating), timeZone);
};

// Where a paused reminder should start when it is resumed. Its frozen occurrence still counts if it
// is in the future; a recurring series that is overdue moves to its next occurrence, and an overdue
// one-off is sent right away
export const nextResumeDueAt = (
  reminder: Pick<Reminder, "dueAt" | "rrule" | "timezone">,
  now = new Date()
): Date => {
  if (reminder.dueAt.getTime() > now.getTime()) return reminder.dueAt;
  if (reminder.rrule) {
    const next = nextOccurrence(reminder.rrule, reminder.timezone, now);
    if (next) return next;
  }
  return now;
};

// "every week on Monday, Wednesday" for list results and confirmations
export const repeatToText = (rruleText: string): string => {
  try {
    return RRule.fromString(rruleText).toText();
  } catch {
    return "repeats";
  }
};

// "YYYY-MM-DDTHH:mm" in the user's wall-clock time, the value a datetime-local input expects
export const localInputValue = (date: Date, timeZone: string): string => {
  const parts = zonedParts(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
};

// The dashboard's edit form uses the friendly repeat fields, so the stored rule is translated back
// into them. Rules that are not expressible that way still round-trip through their `freq` and
// `interval`
export const repeatFromRRule = (rruleText: string): ReminderRepeat | null => {
  try {
    const rule = RRule.fromString(rruleText);
    const options = rule.origOptions ?? rule.options;
    const frequency: RepeatFrequency | undefined =
      options.freq === RRule.DAILY
        ? "daily"
        : options.freq === RRule.WEEKLY
          ? "weekly"
          : options.freq === RRule.MONTHLY
            ? "monthly"
            : options.freq === RRule.YEARLY
              ? "yearly"
              : undefined;
    if (!frequency) return null;

    const repeat: ReminderRepeat = { frequency };
    const interval = options.interval ?? 1;
    if (interval > 1) repeat.interval = interval;

    if (frequency === "weekly" && Array.isArray(options.byweekday)) {
      repeat.weekdays = options.byweekday.map((weekday) => {
        if (typeof weekday === "number") return (weekday + 1) % 7;
        if (typeof weekday === "string") return Weekday.fromStr(weekday).getJsWeekday();
        return weekday.getJsWeekday();
      });
    }
    if (frequency === "monthly" && options.bymonthday !== undefined && options.bymonthday !== null) {
      const day = Array.isArray(options.bymonthday) ? options.bymonthday[0] : options.bymonthday;
      if (day) repeat.dayOfMonth = day;
    }
    return repeat;
  } catch {
    return null;
  }
};
