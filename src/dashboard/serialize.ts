import type { ChannelIdentifier, Reminder } from "../db/schema.js";
import {
  formatInZone,
  localInputValue,
  repeatFromRRule,
  repeatToText,
} from "../inngest/reminder-schedule.js";

const timeAndDate = {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZoneName: "short",
} as const;

export const reminderJson = (reminder: Reminder) => ({
  id: reminder.id,
  text: reminder.text,
  platform: reminder.platform,
  status: reminder.status,
  dueAt: reminder.dueAt.toISOString(),
  // The value for a datetime-local input, in the reminder's own timezone
  dueAtInput: localInputValue(reminder.dueAt, reminder.timezone),
  nextLocal: formatInZone(reminder.dueAt, reminder.timezone, timeAndDate),
  timezone: reminder.timezone,
  repeat: reminder.rrule ? repeatToText(reminder.rrule) : null,
  repeatSpec: reminder.rrule ? repeatFromRRule(reminder.rrule) : null,
  lastSentAt: reminder.lastSentAt?.toISOString() ?? null,
  lastSentLocal: reminder.lastSentAt
    ? formatInZone(reminder.lastSentAt, reminder.timezone, timeAndDate)
    : null,
  createdAt: reminder.createdAt.toISOString(),
});

export const channelJson = (channel: ChannelIdentifier) => ({
  id: channel.id,
  platform: channel.platform,
  handle: channel.externalUserId,
  linkedAt: channel.linkedAt.toISOString(),
  lastSeenAt: channel.lastSeenAt?.toISOString() ?? null,
  // False until the user has sent the assistant a message on this channel: a reminder needs a
  // conversation to be delivered to
  ready: Boolean(channel.chatId),
});

export type DashboardReminder = ReturnType<typeof reminderJson>;
export type DashboardChannel = ReturnType<typeof channelJson>;
