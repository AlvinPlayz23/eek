// Auto-loaded by Trigger.dev before every run (init.ts at the root of the trigger dir).
import * as Sentry from '@sentry/node'
import { tasks } from '@trigger.dev/sdk'

Sentry.init({
  dsn: process.env.TRIGGER_SENTRY_DSN,
  // Trigger.dev runs its own OpenTelemetry setup for run tracing; Sentry's default
  // integrations would register a second one, so only error capture is enabled here.
  defaultIntegrations: false,
})

// Fires once a run has failed for good (after retries), not on every failed attempt.
tasks.onFailure(async ({ ctx, error }) => {
  Sentry.withScope((scope) => {
    scope.setTags({
      'trigger.task': ctx.task.id,
      'trigger.run_id': ctx.run.id,
      'trigger.attempt': ctx.attempt.number,
    })
    scope.setContext('trigger', {
      runId: ctx.run.id,
      taskId: ctx.task.id,
      environment: ctx.environment.slug,
      version: ctx.run.version,
    })
    // Environment and release come from the run, since one worker can serve several
    // Trigger.dev environments. Payloads hold user messages, so they are not attached.
    scope.addEventProcessor((event) => ({
      ...event,
      environment: ctx.environment.type.toLowerCase(),
      release: event.release ?? ctx.run.version,
    }))
    Sentry.captureException(error)
  })
  // Runs can be torn down right after the hook returns; make sure the event is sent.
  await Sentry.flush(2000)
})
