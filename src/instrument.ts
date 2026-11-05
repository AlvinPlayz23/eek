// Loaded with `node --import` before any other module so Sentry can instrument the HTTP server.
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment:
    process.env.SENTRY_ENVIRONMENT ??
    process.env.RAILWAY_ENVIRONMENT_NAME ??
    process.env.NODE_ENV ??
    'development',
  release: process.env.SENTRY_RELEASE ?? process.env.RAILWAY_GIT_COMMIT_SHA,
  // Webhook requests carry secret headers and user message bodies: keep the SDK's
  // conservative defaults (no `dataCollection`, no local variables on frames).
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
})
