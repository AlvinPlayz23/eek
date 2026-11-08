import { and, asc, desc, eq, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "./index.js";
import { reminders, type NewReminder, type Reminder, type ReminderStatus } from "./schema.js";

export const MAX_PENDING_REMINDERS = 50;
export const MAX_REMINDER_ATTEMPTS = 3;
// Long enough for one delivery step, short enough that a crashed run is retried quickly
const CLAIM_MINUTES = 5;

export const insertReminder = async (reminder: NewReminder): Promise<Reminder> => {
  if (!reminder.dedupeKey) {
    const rows = await db.insert(reminders).values(reminder).returning();
    return rows[0]!;
  }

  const rows = await db
    .insert(reminders)
    .values(reminder)
    .onConflictDoNothing({ target: reminders.dedupeKey })
    .returning();
  if (rows[0]) return rows[0];

  const existing = await loadReminderByDedupeKey(reminder.dedupeKey);
  if (!existing) throw new Error("Reminder insert conflicted but no existing row was found.");
  return existing;
};

export const loadReminder = async (id: string): Promise<Reminder | null> => {
  const rows = await db.select().from(reminders).where(eq(reminders.id, id)).limit(1);
  return rows[0] ?? null;
};

export const loadReminderByDedupeKey = async (dedupeKey: string): Promise<Reminder | null> => {
  const rows = await db
    .select()
    .from(reminders)
    .where(eq(reminders.dedupeKey, dedupeKey))
    .limit(1);
  return rows[0] ?? null;
};

export const listPendingReminders = async (
  clerkUserId: string,
  limit = MAX_PENDING_REMINDERS
): Promise<Reminder[]> =>
  db
    .select()
    .from(reminders)
    .where(and(eq(reminders.clerkUserId, clerkUserId), eq(reminders.status, "pending")))
    .orderBy(asc(reminders.dueAt))
    .limit(limit);

export const countPendingReminders = async (clerkUserId: string): Promise<number> => {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reminders)
    .where(and(eq(reminders.clerkUserId, clerkUserId), eq(reminders.status, "pending")));
  return rows[0]?.count ?? 0;
};

// Paused reminders still hold a slot, so a user cannot park fifty and create fifty more
export const countActiveReminders = async (clerkUserId: string): Promise<number> => {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reminders)
    .where(
      and(eq(reminders.clerkUserId, clerkUserId), inArray(reminders.status, ["pending", "paused"]))
    );
  return rows[0]?.count ?? 0;
};

export const countReminderStatuses = async (
  clerkUserId: string
): Promise<Record<ReminderStatus, number>> => {
  const rows = await db
    .select({ status: reminders.status, count: sql<number>`count(*)::int` })
    .from(reminders)
    .where(eq(reminders.clerkUserId, clerkUserId))
    .groupBy(reminders.status);
  const counts: Record<ReminderStatus, number> = {
    pending: 0,
    paused: 0,
    sent: 0,
    canceled: 0,
    failed: 0,
  };
  for (const row of rows) counts[row.status] = row.count;
  return counts;
};

export const loadUserReminder = async (
  clerkUserId: string,
  id: string
): Promise<Reminder | null> => {
  const rows = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.clerkUserId, clerkUserId)))
    .limit(1);
  return rows[0] ?? null;
};

export const listUserReminders = async (
  clerkUserId: string,
  statuses: ReminderStatus[],
  limit = 50
): Promise<Reminder[]> =>
  db
    .select()
    .from(reminders)
    .where(and(eq(reminders.clerkUserId, clerkUserId), inArray(reminders.status, statuses)))
    .orderBy(
      // Upcoming and paused read soonest first; finished reminders read most recent first
      ...(statuses.includes("sent") || statuses.includes("canceled") || statuses.includes("failed")
        ? [desc(sql`coalesce(${reminders.lastSentAt}, ${reminders.dueAt})`)]
        : [asc(reminders.dueAt)])
    )
    .limit(limit);

// Cancels one series, active or paused. False means it was already canceled, sent, failed, or
// belongs to someone else
export const cancelReminder = async (clerkUserId: string, id: string): Promise<boolean> => {
  const rows = await db
    .update(reminders)
    .set({ status: "canceled", claimedUntil: null })
    .where(
      and(
        eq(reminders.id, id),
        eq(reminders.clerkUserId, clerkUserId),
        inArray(reminders.status, ["pending", "paused"])
      )
    )
    .returning({ id: reminders.id });
  return rows.length > 0;
};

// Changes the text and/or the schedule. Editing a reminder keeps its status: a paused series stays
// paused, and a pending one is rescheduled by the caller
export const updateReminder = async (
  clerkUserId: string,
  id: string,
  fields: { text: string; dueAt: Date; rrule: string | null; timezone: string }
): Promise<Reminder | null> => {
  const rows = await db
    .update(reminders)
    .set({ ...fields, attempts: 0, claimedUntil: null })
    .where(
      and(
        eq(reminders.id, id),
        eq(reminders.clerkUserId, clerkUserId),
        inArray(reminders.status, ["pending", "paused"])
      )
    )
    .returning();
  return rows[0] ?? null;
};

// A paused reminder keeps its next occurrence frozen; the caller decides what that should be when
// it is resumed. The delayed Inngest event that fires in the meantime is a no-op because the claim
// only matches pending rows
export const pauseReminder = async (clerkUserId: string, id: string): Promise<Reminder | null> => {
  const rows = await db
    .update(reminders)
    .set({ status: "paused", claimedUntil: null })
    .where(
      and(
        eq(reminders.id, id),
        eq(reminders.clerkUserId, clerkUserId),
        eq(reminders.status, "pending")
      )
    )
    .returning();
  return rows[0] ?? null;
};

export const resumeReminder = async (
  clerkUserId: string,
  id: string,
  dueAt: Date
): Promise<Reminder | null> => {
  const rows = await db
    .update(reminders)
    .set({ status: "pending", dueAt, attempts: 0, claimedUntil: null })
    .where(
      and(
        eq(reminders.id, id),
        eq(reminders.clerkUserId, clerkUserId),
        eq(reminders.status, "paused")
      )
    )
    .returning();
  return rows[0] ?? null;
};

export const listRecentDeliveries = async (clerkUserId: string, limit = 5) =>
  db
    .select({
      id: reminders.id,
      text: reminders.text,
      platform: reminders.platform,
      lastSentAt: reminders.lastSentAt,
    })
    .from(reminders)
    .where(and(eq(reminders.clerkUserId, clerkUserId), isNotNull(reminders.lastSentAt)))
    .orderBy(desc(reminders.lastSentAt))
    .limit(limit);

// Claims one specific occurrence. Matching dueAt means a delayed event from an old occurrence
// cannot deliver the new one. The update is atomic, so the event and the hourly sweep can race
export const claimReminder = async (
  id: string,
  scheduledFor: Date
): Promise<Reminder | null> => {
  const rows = await db
    .update(reminders)
    .set({ claimedUntil: sql`now() + ${CLAIM_MINUTES} * interval '1 minute'` })
    .where(
      and(
        eq(reminders.id, id),
        eq(reminders.status, "pending"),
        eq(reminders.dueAt, scheduledFor),
        or(isNull(reminders.claimedUntil), lte(reminders.claimedUntil, sql`now()`))
      )
    )
    .returning();
  return rows[0] ?? null;
};

// Takes the due reminders for the hourly fallback. The lease is deliberately short: if the run
// dies after claiming, the next sweep picks the reminder up again. The conditional update makes
// the claim atomic against a delayed event firing at the same time
export const claimDueReminders = async (limit: number): Promise<Reminder[]> => {
  const due = await db
    .select({ id: reminders.id })
    .from(reminders)
    .where(
      and(
        eq(reminders.status, "pending"),
        lte(reminders.dueAt, sql`now()`),
        or(isNull(reminders.claimedUntil), lte(reminders.claimedUntil, sql`now()`))
      )
    )
    .orderBy(asc(reminders.dueAt))
    .limit(limit);
  if (due.length === 0) return [];

  return db
    .update(reminders)
    .set({ claimedUntil: sql`now() + ${CLAIM_MINUTES} * interval '1 minute'` })
    .where(
      and(
        inArray(reminders.id, due.map((row) => row.id)),
        eq(reminders.status, "pending"),
        lte(reminders.dueAt, sql`now()`),
        or(isNull(reminders.claimedUntil), lte(reminders.claimedUntil, sql`now()`))
      )
    )
    .returning();
};

export const markReminderSent = async (id: string, nextDueAt: Date | null): Promise<void> => {
  if (nextDueAt) {
    await db
      .update(reminders)
      .set({
        dueAt: nextDueAt,
        status: "pending",
        attempts: 0,
        claimedUntil: null,
        lastSentAt: sql`now()`,
      })
      .where(eq(reminders.id, id));
    return;
  }
  await db
    .update(reminders)
    .set({ status: "sent", claimedUntil: null, lastSentAt: sql`now()` })
    .where(eq(reminders.id, id));
};

export const recordReminderFailure = async (
  id: string,
  attempts: number
): Promise<{ attempts: number; status: "pending" | "failed" }> => {
  const status = attempts >= MAX_REMINDER_ATTEMPTS ? "failed" : "pending";
  await db.update(reminders).set({ attempts, status, claimedUntil: null }).where(eq(reminders.id, id));
  return { attempts, status };
};

// A recurring reminder that failed for good this time still belongs to the user: keep the series
// and skip this occurrence rather than ending it because of a temporary outage
export const skipReminderOccurrence = async (id: string, nextDueAt: Date): Promise<void> => {
  await db
    .update(reminders)
    .set({ dueAt: nextDueAt, status: "pending", attempts: 0, claimedUntil: null })
    .where(eq(reminders.id, id));
};

