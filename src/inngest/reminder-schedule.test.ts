import assert from "node:assert/strict";
import test from "node:test";
import {
  buildReminderSchedule,
  isValidTimeZone,
  nextOccurrence,
} from "./reminder-schedule.js";

test("a weekly reminder keeps its local time across DST", () => {
  const first = buildReminderSchedule(
    new Date("2026-03-23T09:00:00Z"),
    "Europe/London",
    { frequency: "weekly", weekdays: [1, 3] }
  );
  assert.equal(first.dueAt.toISOString(), "2026-03-23T09:00:00.000Z");

  const next = nextOccurrence(
    first.rrule!,
    "Europe/London",
    new Date("2026-03-25T10:00:00Z")
  );
  // Monday 30 March is BST: 09:00 in London is 08:00 UTC
  assert.equal(next?.toISOString(), "2026-03-30T08:00:00.000Z");
});

test("the first occurrence snaps to the repeat", () => {
  const schedule = buildReminderSchedule(
    new Date("2026-03-24T09:00:00Z"),
    "Europe/London",
    { frequency: "weekly", weekdays: [1, 3] }
  );
  assert.equal(schedule.dueAt.toISOString(), "2026-03-25T09:00:00.000Z");
});

test("a one-off reminder has no rule", () => {
  const dueAt = new Date("2026-11-10T09:00:00Z");
  const schedule = buildReminderSchedule(dueAt, "Europe/London");
  assert.equal(schedule.dueAt, dueAt);
  assert.equal(schedule.rrule, null);
});

test("a monthly rule skips months that don't have its day", () => {
  const schedule = buildReminderSchedule(
    new Date("2026-01-31T09:00:00Z"),
    "Europe/London",
    { frequency: "monthly", dayOfMonth: 31 }
  );
  const next = nextOccurrence(
    schedule.rrule!,
    "Europe/London",
    new Date("2026-02-01T00:00:00Z")
  );
  assert.equal(next?.toISOString(), "2026-03-31T08:00:00.000Z");
});

test("timezone validation rejects names Intl does not know", () => {
  assert.equal(isValidTimeZone("Europe/London"), true);
  assert.equal(isValidTimeZone("Mars/Olympus_Mons"), false);
});
