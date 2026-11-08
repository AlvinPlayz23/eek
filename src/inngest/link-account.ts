import * as Sentry from "@sentry/node";
import { NonRetriableError } from "inngest";
import { fetchUserInfo, pollToken, startDeviceAuthorization } from "../clerk-oauth.js";
import { findChannelLink } from "../db/channel-links.js";
import { db } from "../db/index.js";
import { channelIdentifiers } from "../db/schema.js";
import { log } from "../log.js";
import { sendChannelText } from "./channels.js";
import { inngest } from "./client.js";
import { accountLinkRequested } from "./events.js";
import { reportFailure } from "./failure.js";

type PollResult =
  | { status: "pending" }
  | { status: "slow_down" }
  | { status: "denied" }
  | { status: "expired" }
  | { status: "linked"; clerkUserId?: string; email?: string };

// Links a chat platform user to their Clerk account: sends them a sign-in link and code, waits for
// them to approve it in the browser, then records which Clerk user they are
export const linkChannelAccount = inngest.createFunction(
  {
    id: "link-channel-account",
    triggers: [accountLinkRequested],
    // A retry would send a second code; let the user start over by messaging again instead
    retries: 0,
    // One flow per unlinked user at a time, so repeated messages while a code is still valid don't
    // each start a new one. The lock frees when the run ends, so the next message may start a new
    // flow right away
    singleton: { key: 'event.data.platform + ":" + event.data.externalUserId', mode: "skip" },
    onFailure: async ({ error, event }) => {
      await reportFailure(error, { function: "link-channel-account", runId: event.data.run_id });
    },
  },
  async ({ event, step }) => {
    const { platform, externalUserId, chatId } = event.data;
    const sendMessage = (text: string) => sendChannelText(platform, chatId, text);

    if (await step.run("check-linked", async () => Boolean(await findChannelLink(platform, externalUserId)))) {
      return { status: "already-linked" as const };
    }

    const device = await step.run("start-device-authorization", startDeviceAuthorization);
    log.info("Account linking started", { "channel.platform": platform });
    await step.run("send-link", () =>
      sendMessage(
        [
          "Connect your account to start chatting.",
          "",
          `Open this link and sign in: ${device.verification_uri_complete}`,
          "",
          `Or go to ${device.verification_uri} and enter the code ${device.user_code}`,
          "",
          `The code expires in ${Math.round(device.expires_in / 60)} minutes.`,
        ].join("\n")
      )
    );

    // Counted in whole intervals rather than clock time, so replays of this function agree on how
    // far along the flow is
    let interval = Math.max(device.interval, 5);
    for (let waited = 0, poll = 0; waited < device.expires_in; poll++) {
      await step.sleep(`wait-${poll}`, `${interval}s`);
      waited += interval;

      const result: PollResult = await step.run(`poll-${poll}`, async (): Promise<PollResult> => {
        const token = await pollToken(device.device_code);
        if ("access_token" in token) {
          const user = await fetchUserInfo(token.access_token);
          // The unique index keeps an existing link if two flows for the same user both finish
          await db
            .insert(channelIdentifiers)
            .values({ platform, externalUserId, clerkUserId: user.sub, chatId, lastSeenAt: new Date() })
            .onConflictDoNothing();
          const link = await findChannelLink(platform, externalUserId);
          // The platform handle isn't logged (a Linq handle is a phone number or email): the
          // Clerk id identifies the user
          if (link) Sentry.setUser({ id: link.clerkUserId });
          log.info("Account linked", {
            "channel.platform": platform,
            // False when a concurrent flow linked this handle to another Clerk user first
            "account.link_new": link?.clerkUserId === user.sub,
          });
          return { status: "linked", clerkUserId: link?.clerkUserId, email: user.email };
        }
        switch (token.error) {
          case "authorization_pending":
            return { status: "pending" };
          case "slow_down":
            return { status: "slow_down" };
          case "access_denied":
            return { status: "denied" };
          case "expired_token":
            return { status: "expired" };
          default:
            throw new NonRetriableError(
              `Device flow failed: ${token.error} ${token.error_description ?? ""}`
            );
        }
      });

      switch (result.status) {
        case "linked":
          await step.run("send-linked", () =>
            sendMessage(
              `You're connected${result.email ? ` as ${result.email}` : ""}. Send me a message to get started.`
            )
          );
          return { status: "linked" as const, clerkUserId: result.clerkUserId };
        case "denied":
          log.info("Account linking denied", { "channel.platform": platform });
          await step.run("send-denied", () =>
            sendMessage("Sign-in was cancelled. Send me any message to try again.")
          );
          return { status: "denied" as const };
        case "expired":
          waited = device.expires_in;
          break;
        case "slow_down":
          interval += 5;
          break;
        case "pending":
          break;
      }
    }

    // Many expiries mean users get the link but don't finish signing in
    log.info("Account linking expired", { "channel.platform": platform });
    await step.run("send-expired", () =>
      sendMessage("The sign-in code expired. Send me any message to get a new one.")
    );
    return { status: "expired" as const };
  }
);
