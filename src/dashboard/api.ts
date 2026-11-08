import { Hono, type MiddlewareHandler } from "hono";
import { z } from "zod";
import { hasProPlan, upgradeUrl } from "../billing.js";
import {
  findUserChannelLink,
  listChannelLinks,
  touchChannel,
  unlinkChannel,
} from "../db/channel-links.js";
import { latestChatId, listRecentInbox } from "../db/chat.js";
import { deleteUserData } from "../db/dashboard.js";
import { loadProfile, saveTimezone } from "../db/profiles.js";
import {
  MAX_PENDING_REMINDERS,
  cancelReminder,
  countActiveReminders,
  countReminderStatuses,
  insertReminder,
  listRecentDeliveries,
  listUserReminders,
  loadUserReminder,
  pauseReminder,
  resumeReminder,
  updateReminder,
} from "../db/reminders.js";
import type { InboxPart, ReminderStatus } from "../db/schema.js";
import { log } from "../log.js";
import { scheduleReminderEvent } from "../inngest/reminder-events.js";
import {
  REPEAT_FREQUENCIES,
  buildReminderSchedule,
  isValidTimeZone,
  localInputValue,
  nextResumeDueAt,
  repeatFromRRule,
  wallTimeToDate,
} from "../inngest/reminder-schedule.js";
import { channelJson, reminderJson } from "./serialize.js";
import {
  clearSessionCookie,
  readSession,
  type DashboardSession,
} from "./session.js";

type Env = { Variables: { session: DashboardSession } };

const api = new Hono<Env>();

const requireSession: MiddlewareHandler<Env> = async (c, next) => {
  const session = readSession(c);
  if (!session) return c.json({ error: "Sign in to continue." }, 401);
  c.set("session", session);
  await next();
};

api.use("*", requireSession);

const localDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a date and time.");

const repeatSchema = z.object({
  frequency: z.enum(REPEAT_FREQUENCIES),
  interval: z.number().int().min(1).max(52).optional(),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
});

const createSchema = z.object({
  text: z.string().trim().min(1, "Write the reminder.").max(1000),
  channelId: z.string().uuid("Choose a channel."),
  timezone: z.string().min(1).max(100),
  dueAt: localDate,
  repeat: repeatSchema.nullable().optional(),
});

const editSchema = z.object({
  text: z.string().trim().min(1, "Write the reminder.").max(1000).optional(),
  dueAt: localDate.optional(),
  repeat: repeatSchema.nullable().optional(),
});

const timezoneSchema = z.object({
  timezone: z.string().min(1).max(100),
});

const scheduleErrorMessage = (error: unknown) =>
  error instanceof Error && error.name === "ToolInputError"
    ? error.message
    : "That repeat is not valid.";

// "YYYY-MM-DDTHH:mm" in the user's wall clock. A date that does not survive the round trip (say,
// 31 February) is rejected instead of being silently moved
const parseLocal = (value: string, timezone: string): Date | null => {
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart!.split("-").map(Number);
  const [hour, minute] = timePart!.split(":").map(Number);
  const date = wallTimeToDate(
    { year: year!, month: month!, day: day!, hour: hour!, minute: minute!, second: 0 },
    timezone
  );
  return localInputValue(date, timezone) === value ? date : null;
};

const inThePast = (date: Date) => date.getTime() < Date.now() - 60_000;

const snippet = (parts: InboxPart[]) => {
  const text = parts.find((part) => part.type === "text");
  if (!text || text.type !== "text") return "Attachment";
  return text.text.length > 90 ? `${text.text.slice(0, 90)}…` : text.text;
};

const proPlan = (clerkUserId: string) => hasProPlan(clerkUserId).catch(() => null);

api.get("/overview", async (c) => {
  const session = c.get("session");
  const [profile, channels, counts, upcoming, inbox, deliveries, pro] = await Promise.all([
    loadProfile(session.sub),
    listChannelLinks(session.sub),
    countReminderStatuses(session.sub),
    listUserReminders(session.sub, ["pending"], 5),
    listRecentInbox(session.sub, 5),
    listRecentDeliveries(session.sub, 5),
    proPlan(session.sub),
  ]);

  const activity = [
    ...inbox.map((row) => ({
      id: row.id,
      kind: "message" as const,
      platform: row.platform,
      at: row.receivedAt.toISOString(),
      title: snippet(row.parts),
    })),
    ...deliveries.map((row) => ({
      id: row.id,
      kind: "reminder" as const,
      platform: row.platform,
      at: row.lastSentAt!.toISOString(),
      title: `Reminder sent: ${row.text}`,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  return c.json({
    user: { email: session.email ?? null },
    pro,
    timezone: profile?.timezone ?? null,
    channels: channels.map(channelJson),
    counts: {
      upcoming: counts.pending,
      paused: counts.paused,
      past: counts.sent + counts.canceled + counts.failed,
    },
    quota: {
      used: counts.pending + counts.paused,
      limit: MAX_PENDING_REMINDERS,
    },
    reminders: upcoming.map(reminderJson),
    activity,
  });
});

api.get("/reminders", async (c) => {
  const session = c.get("session");
  const requested = c.req.query("tab");
  const tab = requested === "paused" || requested === "past" ? requested : "upcoming";
  const statuses: ReminderStatus[] =
    tab === "past" ? ["sent", "canceled", "failed"] : [tab === "paused" ? "paused" : "pending"];

  const [profile, rows, counts] = await Promise.all([
    loadProfile(session.sub),
    listUserReminders(session.sub, statuses),
    countReminderStatuses(session.sub),
  ]);

  return c.json({
    tab,
    timezone: profile?.timezone ?? null,
    reminders: rows.map(reminderJson),
    counts: {
      upcoming: counts.pending,
      paused: counts.paused,
      past: counts.sent + counts.canceled + counts.failed,
    },
    quota: { used: counts.pending + counts.paused, limit: MAX_PENDING_REMINDERS },
  });
});

api.post("/reminders", async (c) => {
  const session = c.get("session");
  const parsed = createSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid reminder." }, 400);
  }
  const input = parsed.data;
  if (!isValidTimeZone(input.timezone)) {
    return c.json({ error: "That is not a valid timezone." }, 400);
  }

  const channel = await findUserChannelLink(session.sub, input.channelId);
  if (!channel) return c.json({ error: "That channel is not linked." }, 404);
  const chatId = channel.chatId ?? (await latestChatId(session.sub, channel.platform));
  if (!chatId) {
    return c.json(
      {
        error: `Send the assistant a message on ${channel.platform === "telegram" ? "Telegram" : "iMessage"} first, so it knows where to deliver reminders.`,
      },
      400
    );
  }
  if (channel.chatId !== chatId) {
    await touchChannel(channel.platform, channel.externalUserId, chatId);
  }

  const dueAt = parseLocal(input.dueAt, input.timezone);
  if (!dueAt) return c.json({ error: "That date and time does not exist." }, 400);
  if (inThePast(dueAt)) {
    return c.json({ error: "Choose a date and time in the future." }, 400);
  }

  let schedule: ReturnType<typeof buildReminderSchedule>;
  try {
    schedule = buildReminderSchedule(dueAt, input.timezone, input.repeat ?? undefined);
  } catch (error) {
    return c.json({ error: scheduleErrorMessage(error) }, 400);
  }
  if (inThePast(schedule.dueAt)) {
    return c.json({ error: "Choose a date and time in the future." }, 400);
  }

  if ((await countActiveReminders(session.sub)) >= MAX_PENDING_REMINDERS) {
    return c.json(
      { error: `You already have ${MAX_PENDING_REMINDERS} active reminders. Cancel one first.` },
      400
    );
  }

  // A reminder keeps its own timezone. Only seed the profile when it has none, so creating a
  // reminder for another city doesn't silently change the user's default. Read the profile before
  // the insert so a database failure can't leave a reminder behind without a response.
  const profile = await loadProfile(session.sub);
  const reminder = await insertReminder({
    clerkUserId: session.sub,
    platform: channel.platform,
    chatId,
    text: input.text,
    dueAt: schedule.dueAt,
    rrule: schedule.rrule,
    timezone: input.timezone,
  });
  if (!profile?.timezone) {
    await saveTimezone(session.sub, input.timezone).catch((error) => {
      log.error("Dashboard reminder created but profile timezone was not set", {
        "reminder.id": reminder.id,
        "error.name": error instanceof Error ? error.name : "unknown",
      });
    });
  }

  // The reminder is stored even if Inngest is down: the hourly sweep delivers it
  await scheduleReminderEvent(reminder).catch((error) => {
    log.error("Dashboard reminder created but not scheduled", {
      "reminder.id": reminder.id,
      "error.name": error instanceof Error ? error.name : "unknown",
    });
  });

  return c.json({ reminder: reminderJson(reminder) }, 201);
});

api.patch("/reminders/:id", async (c) => {
  const session = c.get("session");
  const parsed = editSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid reminder." }, 400);
  }
  const reminder = await loadUserReminder(session.sub, c.req.param("id"));
  if (!reminder) return c.json({ error: "Reminder not found." }, 404);
  if (reminder.status !== "pending" && reminder.status !== "paused") {
    return c.json({ error: "This reminder has already finished." }, 409);
  }

  const input = parsed.data;
  const text = input.text ?? reminder.text;
  let dueAt = reminder.dueAt;
  let rrule = reminder.rrule;

  if (input.dueAt) {
    const parsedDate = parseLocal(input.dueAt, reminder.timezone);
    if (!parsedDate) return c.json({ error: "That date and time does not exist." }, 400);
    dueAt = parsedDate;
  }

  try {
    if (input.repeat !== undefined) {
      const schedule = buildReminderSchedule(dueAt, reminder.timezone, input.repeat ?? undefined);
      dueAt = schedule.dueAt;
      rrule = schedule.rrule;
    } else if (input.dueAt && reminder.rrule) {
      // The stored rule carries its own start, so moving a recurring reminder rebuilds it at the
      // new time instead of keeping the old one
      const repeat = repeatFromRRule(reminder.rrule);
      if (!repeat) {
        return c.json(
          { error: "This repeat can't be edited here. Cancel the reminder and create a new one." },
          400
        );
      }
      const schedule = buildReminderSchedule(dueAt, reminder.timezone, repeat);
      dueAt = schedule.dueAt;
      rrule = schedule.rrule;
    }
  } catch (error) {
    return c.json({ error: scheduleErrorMessage(error) }, 400);
  }

  if (input.dueAt && inThePast(dueAt)) {
    return c.json({ error: "Choose a date and time in the future." }, 400);
  }

  const updated = await updateReminder(session.sub, reminder.id, {
    text,
    dueAt,
    rrule,
    timezone: reminder.timezone,
  });
  if (!updated) return c.json({ error: "This reminder changed in the meantime." }, 409);

  if (updated.status === "pending") {
    await scheduleReminderEvent(updated, `edited-${Date.now()}`).catch((error) => {
      log.error("Dashboard reminder edited but not rescheduled", {
        "reminder.id": updated.id,
        "error.name": error instanceof Error ? error.name : "unknown",
      });
    });
  }

  return c.json({ reminder: reminderJson(updated) });
});

api.post("/reminders/:id/pause", async (c) => {
  const session = c.get("session");
  const reminder = await pauseReminder(session.sub, c.req.param("id"));
  if (!reminder) return c.json({ error: "No active reminder has that id." }, 404);
  return c.json({ reminder: reminderJson(reminder) });
});

api.post("/reminders/:id/resume", async (c) => {
  const session = c.get("session");
  const reminder = await loadUserReminder(session.sub, c.req.param("id"));
  if (!reminder) return c.json({ error: "Reminder not found." }, 404);
  if (reminder.status !== "paused") return c.json({ error: "That reminder is not paused." }, 409);

  const resumed = await resumeReminder(session.sub, reminder.id, nextResumeDueAt(reminder));
  if (!resumed) return c.json({ error: "This reminder changed in the meantime." }, 409);

  await scheduleReminderEvent(resumed, `resumed-${Date.now()}`).catch((error) => {
    log.error("Dashboard reminder resumed but not scheduled", {
      "reminder.id": resumed.id,
      "error.name": error instanceof Error ? error.name : "unknown",
    });
  });

  return c.json({ reminder: reminderJson(resumed) });
});

api.post("/reminders/:id/cancel", async (c) => {
  const session = c.get("session");
  const canceled = await cancelReminder(session.sub, c.req.param("id"));
  if (!canceled) return c.json({ error: "No active reminder has that id." }, 404);
  return c.json({ ok: true });
});

api.get("/billing", async (c) => {
  const session = c.get("session");
  return c.json({ pro: await proPlan(session.sub), portalUrl: upgradeUrl() });
});

api.get("/settings", async (c) => {
  const session = c.get("session");
  const [profile, channels, pro] = await Promise.all([
    loadProfile(session.sub),
    listChannelLinks(session.sub),
    proPlan(session.sub),
  ]);
  return c.json({
    email: session.email ?? null,
    timezone: profile?.timezone ?? null,
    channels: channels.map(channelJson),
    pro,
  });
});

api.patch("/settings/timezone", async (c) => {
  const session = c.get("session");
  const parsed = timezoneSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Choose a timezone." }, 400);
  if (!isValidTimeZone(parsed.data.timezone)) {
    return c.json({ error: "That is not a valid timezone." }, 400);
  }
  await saveTimezone(session.sub, parsed.data.timezone);
  return c.json({ timezone: parsed.data.timezone });
});

api.delete("/settings/channels/:id", async (c) => {
  const session = c.get("session");
  const removed = await unlinkChannel(session.sub, c.req.param("id"));
  if (!removed) return c.json({ error: "Channel not found." }, 404);
  return c.body(null, 204);
});

api.post("/settings/delete", async (c) => {
  const session = c.get("session");
  const body = (await c.req.json().catch(() => null)) as { confirm?: string } | null;
  if (body?.confirm !== "delete") {
    return c.json({ error: 'Type "delete" to confirm.' }, 400);
  }
  await deleteUserData(session.sub);
  clearSessionCookie(c);
  return c.json({ ok: true });
});

export { api };
