// Imported first by the Vercel entrypoint (index.ts) and preloaded with `node --import` elsewhere,
// before any other module, so Sentry can instrument the HTTP server.
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment:
    process.env.SENTRY_ENVIRONMENT ??
    process.env.VERCEL_ENV ??
    process.env.NODE_ENV ??
    'development',
  release: process.env.SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA,
  integrations: [
    // gen_ai spans (model calls, tool calls, tokens, cost) from the AI SDK's `ai:telemetry`
    // channel. Metadata only: chat messages, tool inputs/outputs and the system prompt stay out of
    // Sentry. Both flags must be explicit, since the integration records content by default
    Sentry.vercelAIIntegration({ recordInputs: false, recordOutputs: false }),
  ],
  // The SDK collects all of these by default. Webhook requests carry secret headers
  // (x-telegram-bot-api-secret-token, Linq signatures) and users' messages in their bodies, and
  // local variables hold API keys, so each is opted out explicitly.
  // Users are identified by the opaque Clerk id set in channel-gate.ts instead of their IP
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    genAI: { inputs: false, outputs: false },
    stackFrameVariables: false,
  },
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  // The AI integration reports every failed tool call as an error. Tool calls the model got wrong
  // (ToolInputError in computer-tools.ts) are expected and self-correcting, and their messages
  // carry the user's file paths, so they stay on the span's status only. Matched by name to keep
  // this file from loading the sandbox SDK
  beforeSend: (event, hint) =>
    hint.originalException instanceof Error && hint.originalException.name === 'ToolInputError'
      ? null
      : event,
})
