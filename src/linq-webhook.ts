import type { MessageReceivedWebhookEvent } from "@linqapp/sdk/resources/webhooks";
import * as Sentry from "@sentry/node";
import { Hono } from "hono";
import { enqueueChatMessage, gateErrorAttributes, gateInbound, upgradeMessage } from "./channel-gate.js";
import { UNSUPPORTED_MESSAGE_TEXT } from "./inngest/channel-messages.js";
import { parseLinqMessage } from "./inngest/inbound.js";
import {
  isOptedOutError,
  isOptOutKeyword,
  messageText,
  sendMessage,
  unwrapWebhook,
} from "./inngest/linq-api.js";
import { log } from "./log.js";

// Linq's webhook (iMessage) lands here first, and only one-to-one messages that pass the channel
// gate are queued for the agent. Linq waits 10 seconds for an answer and retries
// non-2xx (except other 4xx) for 30 minutes
export const linqWebhook = new Hono().post("/", async (c) => {
  let event;
  try {
    event = unwrapWebhook(await c.req.text(), c.req.header());
  } catch {
    // Either a rotated signing secret (every message stops reaching the agent) or someone probing
    log.warn("Webhook rejected: invalid signature", { "channel.platform": "linq" });
    return c.text("Invalid signature", 401);
  }

  // Everything but an inbound one-to-one message is acknowledged so Linq doesn't redeliver it.
  // The SDK's event union doesn't narrow `data` on event_type, hence the cast
  if (event.event_type !== "message.received") {
    return c.body(null, 200);
  }
  const { data } = event as MessageReceivedWebhookEvent;
  if (data.direction !== "inbound" || data.chat.is_group) {
    return c.body(null, 200);
  }

  // STOP and the other opt-out keywords are handled by Linq, which blocks every send to the user
  // until they write again; answering them would only bounce off that block
  if (data.parts.every((part) => part.type === "text") && isOptOutKeyword(messageText(data.parts))) {
    log.info("Opt-out keyword received", {
      "channel.platform": "linq",
      "channel.event_id": event.event_id,
    });
    return c.body(null, 200);
  }

  const chatId = data.chat.id;
  let gate;
  try {
    gate = await gateInbound({
      platform: "linq",
      externalUserId: data.sender_handle.handle,
      chatId,
    });
  } catch (error) {
    // A non-2xx makes Linq redeliver, so a Clerk outage retries instead of dropping the message
    Sentry.captureException(error);
    log.error("Channel gate failed", {
      "channel.platform": "linq",
      "channel.event_id": event.event_id,
      ...gateErrorAttributes(error),
    });
    return c.text("Upstream error", 502);
  }

  log.info("Channel message gated", {
    "channel.platform": "linq",
    "channel.event_id": event.event_id,
    "channel.gate_status": gate.status,
  });

  switch (gate.status) {
    case "linking":
      return c.body(null, 200);
    case "upgrade":
      try {
        await sendMessage(chatId, upgradeMessage());
      } catch (error) {
        if (isOptedOutError(error)) return c.body(null, 200);
        Sentry.captureException(error);
        log.error("Upgrade reply failed", {
          "channel.platform": "linq",
          "channel.event_id": event.event_id,
        });
        return c.text("Upstream error", 502);
      }
      return c.body(null, 200);
    case "allowed": {
      const inbound = parseLinqMessage(data);
      if (inbound.kind === "ignore") return c.body(null, 200);
      if (inbound.kind === "unsupported") {
        try {
          await sendMessage(chatId, UNSUPPORTED_MESSAGE_TEXT);
        } catch (error) {
          if (isOptedOutError(error)) return c.body(null, 200);
          Sentry.captureException(error);
          log.error("Unsupported-message reply failed", {
            "channel.platform": "linq",
            "channel.event_id": event.event_id,
          });
          return c.text("Upstream error", 502);
        }
        return c.body(null, 200);
      }
      const queued = await enqueueChatMessage({
        platform: "linq",
        externalMessageId: inbound.externalMessageId,
        clerkUserId: gate.clerkUserId,
        chatId: inbound.chatId,
        parts: inbound.parts,
      });
      return queued ? c.body(null, 200) : c.text("Upstream error", 502);
    }
  }
});
