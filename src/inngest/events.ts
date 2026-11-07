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

// An unlinked user wrote to the assistant
export const accountLinkRequested = eventType("chat/account.link.requested", {
  schema: z.object({
    platform: z.enum(PLATFORMS),
    externalUserId: z.string(),
    chatId: z.string(),
  }),
});
