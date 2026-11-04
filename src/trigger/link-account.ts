import { AbortTaskRunError, idempotencyKeys, logger, schemaTask, wait } from "@trigger.dev/sdk";
import { z } from "zod";
import { findTelegramLink, linkIdempotencyKey } from "../db/channel-links.js";
import { db } from "../db/index.js";
import { channelIdentifiers } from "../db/schema.js";
import { sendMessage } from "./telegram-api.js";

type DeviceAuthorization = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
};

type TokenResponse = { access_token: string } | { error: string; error_description?: string };

// Confidential OAuth app with Device Authorization Grant enabled, created with the Clerk CLI
const oauthRequest = (path: string, body: Record<string, string>) =>
  fetch(`${process.env.CLERK_OAUTH_ISSUER}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${process.env.CLERK_OAUTH_CLIENT_ID}:${process.env.CLERK_OAUTH_CLIENT_SECRET}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });

const startDeviceAuthorization = async () => {
  const res = await oauthRequest("/oauth/device_authorization", {
    client_id: process.env.CLERK_OAUTH_CLIENT_ID!,
    scope: "openid email",
  });
  if (!res.ok) {
    throw new Error(`Device authorization failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as DeviceAuthorization;
};

const pollToken = async (deviceCode: string) => {
  const res = await oauthRequest("/oauth/token", {
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    device_code: deviceCode,
  });
  // Pending, denied and expired requests come back as 400s with an OAuth error code
  if (!res.ok && res.status !== 400) {
    throw new Error(`Token request failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
};

const fetchUserInfo = async (accessToken: string) => {
  const res = await fetch(`${process.env.CLERK_OAUTH_ISSUER}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`userinfo failed: ${res.status} ${await res.text()}`);
  }
  // `sub` is the Clerk user id
  return (await res.json()) as { sub: string; email?: string };
};

// Links a Telegram user to their Clerk account: sends them a sign-in link and code, waits for them
// to approve it in the browser, then records which Clerk user they are
export const linkTelegramAccount = schemaTask({
  id: "link-telegram-account",
  schema: z.object({
    telegramUserId: z.string(),
    chatId: z.number(),
  }),
  // A retry would send a second code; let the user start over by messaging again instead
  retry: { maxAttempts: 1 },
  machine: "micro",
  // Device codes live 10 minutes
  maxDuration: 15 * 60,
  run: async ({ telegramUserId, chatId }) => {
    try {
      if (await findTelegramLink(telegramUserId)) {
        return { status: "already-linked" as const };
      }

      const device = await startDeviceAuthorization();
      await sendMessage(
        chatId,
        [
          "Connect your account to start chatting.",
          "",
          `Open this link and sign in: ${device.verification_uri_complete}`,
          "",
          `Or go to ${device.verification_uri} and enter the code ${device.user_code}`,
          "",
          `The code expires in ${Math.round(device.expires_in / 60)} minutes.`,
        ].join("\n")
      );

      const deadline = Date.now() + device.expires_in * 1000;
      let interval = device.interval;
      while (Date.now() < deadline) {
        // Under a minute, so the run stays warm instead of checkpointing between polls
        await wait.for({ seconds: interval });
        const token = await pollToken(device.device_code);

        if ("access_token" in token) {
          const user = await fetchUserInfo(token.access_token);
          // The unique index keeps an existing link if two flows for the same user both finish
          await db
            .insert(channelIdentifiers)
            .values({ platform: "telegram", externalUserId: telegramUserId, clerkUserId: user.sub })
            .onConflictDoNothing();
          const link = await findTelegramLink(telegramUserId);
          logger.log("Linked Telegram user", { telegramUserId, clerkUserId: link?.clerkUserId });
          await sendMessage(
            chatId,
            `You're connected${user.email ? ` as ${user.email}` : ""}. Send me a message to get started.`
          );
          return { status: "linked" as const, clerkUserId: link?.clerkUserId };
        }

        switch (token.error) {
          case "authorization_pending":
            continue;
          case "slow_down":
            interval += 5;
            continue;
          case "access_denied":
            await sendMessage(chatId, "Sign-in was cancelled. Send me any message to try again.");
            return { status: "denied" as const };
          case "expired_token":
            break;
          default:
            throw new AbortTaskRunError(
              `Device flow failed: ${token.error} ${token.error_description ?? ""}`
            );
        }
        break;
      }

      await sendMessage(chatId, "The sign-in code expired. Send me any message to get a new one.");
      return { status: "expired" as const };
    } finally {
      // The flow is over either way, so the user's next message may start a new one right away
      await idempotencyKeys.reset("link-telegram-account", linkIdempotencyKey(telegramUserId), {
        scope: "global",
      });
    }
  },
});
