import type { Reminder } from "../db/schema.js";
import { inngest } from "./client.js";
import { reminderDue } from "./events.js";

// The occurrence is part of the id, so a retry sends the same event instead of a duplicate, while
// the next occurrence gets a new id. A resumed or edited reminder passes a salt: its occurrence may
// keep the same dueAt as an event that already ran, and Inngest drops a repeated id
export const reminderEventId = (reminderId: string, dueAt: Date, salt?: string) =>
  `reminder-${reminderId}-${dueAt.getTime()}${salt ? `-${salt}` : ""}`;

export const scheduleReminderEvent = async (
  reminder: Pick<Reminder, "id" | "dueAt">,
  salt?: string
): Promise<void> => {
  await inngest.send({
    ...reminderDue.create({
      reminderId: reminder.id,
      scheduledFor: reminder.dueAt.toISOString(),
    }),
    id: reminderEventId(reminder.id, reminder.dueAt, salt),
    ts: reminder.dueAt.getTime(),
  });
};
