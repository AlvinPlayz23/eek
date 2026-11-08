import { eventType } from "inngest";
import { z } from "zod";
import { PLATFORMS } from "../db/schema.js";

// A message passed the channel gate and sits in chat_inbox. Carries no content: the turn reads the
// inbox, so one run answers everything a user sent while it was busy
export const chatMessageReceived = eventType("chat/message.received", {
  schema: z.object({
    platform: z.enum(PLATFORMS),
    clerkUserId: z.string(),
    chatId: z.string(),
  }),
});

// A reminder occurrence is due. The event is sent with `ts` set to the occurrence time, so Inngest
// holds it until then instead of waking a function every minute to poll for due reminders
export const reminderDue = eventType("reminder/due", {
  schema: z.object({
    reminderId: z.string(),
    scheduledFor: z
      .string()
      .refine((value) => !Number.isNaN(Date.parse(value)), "scheduledFor must be a date"),
  }),
});

// An unlinked user wrote to the assistant
export const accountLinkRequested = eventType("chat/account.link.requested", {
  schema: z.object({
    platform: z.enum(PLATFORMS),
    externalUserId: z.string(),
    chatId: z.string(),
  }),
});
