# Personal assistant

A chat assistant on Telegram and iMessage (through Linq). Users link their chat account to a Clerk
account, and Pro subscribers talk to an agent with web access and its own Linux computer (Daytona).

- **Hono** (`src/app.ts`) takes the platforms' webhooks, verifies them and runs the channel gate
  (`src/channel-gate.ts`). Allowed messages are written to Postgres (`chat_inbox`) and announced to
  Inngest.
- **Inngest** (`src/inngest/`, served at `/api/inngest`) runs the work:
  - `chat-turn`: one agent turn at a time per user. Every model call and tool call is a durable
    step. Long shell commands run in the background of the Daytona sandbox and are checked on every
    30 seconds while the run sleeps, so no request waits on them.
  - `link-channel-account`: Clerk device-flow sign-in for new users.
  - `sweep-inbox`: every 15 minutes, restarts conversations whose messages nobody is working on.
- **Postgres** (Neon, Drizzle) holds links, the inbox, per-user locks and conversation transcripts.
  Change the schema in `src/db/schema.ts` and apply it with `npm run db:push`.
- **Vercel** hosts it. `src/index.ts` is the entrypoint (the default-exported Hono app).

## Local development

```
npm install
# create .env with the variables below
npm run dev            # the app on http://localhost:3000
npm run inngest:dev    # the Inngest dev server on http://localhost:8288
npm test               # needs DATABASE_URL pointing at a database with the schema pushed
```

Environment variables: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `INNGEST_DEV=1` (locally),
`INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` (production), `TELEGRAM_BOT_TOKEN`,
`TELEGRAM_WEBHOOK_SECRET`, `LINQ_API_V3_API_KEY`, `LINQ_WEBHOOK_SECRET`, `CLERK_*`,
`DAYTONA_API_KEY`, `FIRECRAWL_API_KEY`, `SENTRY_DSN`, and the Neon AI Gateway settings.

## Deploying to Vercel

1. Import the repository. Keep Fluid compute on (the default), which allows 300 seconds per request
   on Hobby; `checkpointing.maxRuntime` in `src/inngest/client.ts` stays below that.
2. Install Inngest's Vercel integration. It sets `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` and
   syncs the functions on each deploy.
3. Turn off Deployment Protection, or give Inngest the bypass secret in the integration settings,
   so Inngest can call `/api/inngest`.
4. Point the Telegram and Linq webhooks at `/telegram/webhook` and `/linq/webhook`.
