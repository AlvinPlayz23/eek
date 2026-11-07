import * as Sentry from "@sentry/node";

// Reports a run that failed for good (after its retries), once. Event payloads hold users'
// messages, so only the error and the run's ids are attached
export const reportFailure = async (
  error: unknown,
  tags: { function: string; runId: string; clerkUserId?: string }
) => {
  Sentry.withScope((scope) => {
    scope.setTags({ "inngest.function": tags.function, "inngest.run_id": tags.runId });
    if (tags.clerkUserId) scope.setUser({ id: tags.clerkUserId });
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
  });
  await Sentry.flush(2000);
};
