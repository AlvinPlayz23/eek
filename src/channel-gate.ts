import { timingSafeEqual } from "node:crypto";
import * as Sentry from "@sentry/node";
import { hasProPlan, upgradeUrl } from "./billing.js";
import {
  claimProWelcome,
  findChannelLink,
  markUpgradePrompted,
  touchChannel,
} from "./db/channel-links.js";
import { insertInbox } from "./db/chat.js";
import type { InboxPart, Platform } from "./db/schema.js";
import { CHANNELS } from "./inngest/channels.js";
import { inngest } from "./inngest/client.js";
import { accountLinkRequested, chatMessageReceived } from "./inngest/events.js";
import { log } from "./log.js";

// What every channel webhook does once it has verified and parsed a platform's message: only
// messages from users linked to a Clerk account on the Pro plan reach the agent. Unlinked users are
// sent a sign-in link, linked users without Pro an upgrade link

export const secretMatches = (received: string | undefined, expected: string | undefined) => {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

// Sent once, on the first message after a user who was shown the upgrade prompt is on Pro
export const proWelcomeMessage = () =>
  "You have upgraded to Pro. You are now free to ask me anything.";

export const upgradeMessage = () =>
  [
    "The assistant is available on the Pro plan.",
    "",
    `Upgrade here, then send me a message again: ${upgradeUrl()}`,
  ].join("\n");

export type GateResult =
  // An account-linking run is (or already was) messaging the user a sign-in link
  | { status: "linking" }
  // Linked, but not on Pro: the webhook replies with upgradeMessage() its own way
  | { status: "upgrade" }
  // `welcome` is true for the first message after a prompted user subscribed
  | { status: "allowed"; clerkUserId: string; welcome: boolean };

// Throws when the plan check fails, so the webhook can answer with a non-2xx and the platform
// redelivers instead of the message being dropped
export const gateInbound = async ({
  platform,
  externalUserId,
  chatId,
}: {
  platform: Platform;
  externalUserId: string;
  chatId: string;
}): Promise<GateResult> => {
  const link = await findChannelLink(platform, externalUserId);

  if (!link) {
    // The flow is a singleton per user: while one is waiting for the sign-in, this event is skipped
    await inngest.send(accountLinkRequested.create({ platform, externalUserId, chatId }));
    return { status: "linking" };
  }

  // Opaque Clerk id only: attributes this request's logs, errors and spans to the user
  Sentry.setUser({ id: link.clerkUserId });
  if (!(await hasProPlan(link.clerkUserId))) {
    await markUpgradePrompted(platform, externalUserId);
    return { status: "upgrade" };
  }
  // Remember where to reach this user, so the dashboard can create reminders that are delivered
  // to the same chat
  await touchChannel(platform, externalUserId, chatId);
  return {
    status: "allowed",
    clerkUserId: link.clerkUserId,
    welcome: await claimProWelcome(platform, externalUserId),
  };
};

// Queues an allowed message for the agent: stored in the inbox first, then announced. Returns false
// on failure so the webhook answers non-2xx and the platform redelivers; both steps are safe to
// repeat, since the inbox ignores a message it already has and Inngest drops a repeated event id
export const enqueueChatMessage = async ({
  platform,
  externalMessageId,
  clerkUserId,
  chatId,
  parts,
}: {
  platform: Platform;
  externalMessageId: string;
  clerkUserId: string;
  chatId: string;
  parts: InboxPart[];
}) => {
  try {
    const inserted = await insertInbox({
      platform,
      externalMessageId,
      clerkUserId,
      chatId,
      parts,
    });
    await inngest.send(
      chatMessageReceived.create(
        { platform, clerkUserId, chatId },
        { id: `${platform}-${externalMessageId}` }
      )
    );
    // Show the platform's "working…" message as soon as the message is queued instead of waiting
    // for the run to start. Only a newly queued message shows one, so a redelivery after the reply
    // can't leave an orphan behind
    if (inserted && CHANNELS[platform].workingMessage) {
      // Cosmetic: a platform failure must not make the webhook answer non-2xx
      await CHANNELS[platform].setWorking(chatId, true).catch(() => {});
    }
    return true;
  } catch (error) {
    Sentry.captureException(error);
    // The message and its ids aren't logged: the error class says whether it's the database or Inngest
    log.error("Queueing the message failed", {
      "channel.platform": platform,
      "error.name": error instanceof Error ? error.name : "unknown",
    });
    return false;
  }
};
