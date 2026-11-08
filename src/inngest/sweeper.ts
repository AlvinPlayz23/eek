import { deleteOldProcessed, strandedConversations } from "../db/chat.js";
import { pruneExpiredPendingSends } from "../db/pending-sends.js";
import { log } from "../log.js";
import { isPlatformEnabled } from "../platforms.js";
import { inngest } from "./client.js";
import { chatMessageReceived } from "./events.js";
import { reportFailure } from "./failure.js";

// Safety net for the inbox: a message nobody is working on (its run died, or its event was lost)
// would otherwise wait for the user's next message. This starts a run for each such conversation
export const sweepInbox = inngest.createFunction(
  {
    id: "sweep-inbox",
    triggers: { cron: "*/15 * * * *" },
    onFailure: async ({ error, event }) => {
      await reportFailure(error, { function: "sweep-inbox", runId: event.data.run_id });
    },
  },
  async ({ step }) => {
    // A switched-off platform's leftovers wait until it is switched back on
    const stranded = (await step.run("find-stranded", () => strandedConversations(2))).filter(
      (conversation) => isPlatformEnabled(conversation.platform)
    );
    if (stranded.length > 0) {
      log.warn("Restarting stranded conversations", { "chat.stranded": stranded.length });
      await step.sendEvent(
        "restart",
        stranded.map((conversation) => chatMessageReceived.create(conversation))
      );
    }
    await step.run("delete-processed", () => deleteOldProcessed(24));
    // Drafts waiting for confirmation that were never sent: the row is useless once it expires
    await step.run("prune-pending-sends", () => pruneExpiredPendingSends());
    return { restarted: stranded.length };
  }
);
