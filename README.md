# Personal assistant

A chat assistant on Telegram. iMessage (through Linq) is built in but switched off; see
[docs/linq.md](docs/linq.md). Users link their chat account to a Clerk
account, and Pro subscribers talk to an agent that can browse the web and use its own Linux computer
(Daytona).

## How it works

```
Telegram (and Linq, off) ──webhook──▶ Hono (Vercel) ──▶ Postgres inbox ──event──▶ Inngest ──▶ /api/inngest
                              verify + gate                                           chat-turn, link, sweeper, reminders
```

- **Hono** (`src/app.ts`) takes the platforms' webhooks, verifies them and runs the channel gate
  (`src/channel-gate.ts`). A message from a linked Pro user is written to `chat_inbox` and announced
  to Inngest. Unlinked users get a sign-in link, and linked users without Pro get an upgrade link.
- **Dashboard** (`web/`) is a React SPA built into `public/dashboard` and served by Hono at
  `/dashboard/`. It uses the same Clerk device flow as chat linking, but keeps the browser session
  in the app's own signed cookie.
- **Inngest** runs the work as functions in `src/inngest/`, served at `/api/inngest`:
  - `chat-turn`: one agent turn at a time per user. Every model call and tool call is a durable
    step. Long shell commands run in the background of the Daytona sandbox and are checked every
    30 seconds while the run sleeps, so no single request waits on them.
  - `link-channel-account`: Clerk device-flow sign-in for new users.
  - `sweep-inbox`: every 15 minutes, restarts conversations whose messages nobody is working on.
  - `deliver-reminder`: sends one reminder when its delayed `reminder/due` event fires, then
    schedules the next occurrence of a recurring reminder.
  - `sweep-reminders`: hourly fallback that delivers overdue reminders if a delayed event was
    lost or a recurring reminder's next event was not scheduled.
- **Postgres** (Neon, Drizzle) holds channel links, the inbox, per-user locks, conversation
  transcripts, profiles and reminders. Change the schema in `src/db/schema.ts` and apply it with
  `pnpm run db:push`.
- **Vercel** hosts it: `src/index.ts` default-exports the Hono app. `src/local.ts` is the plain
  Node server used by `pnpm run dev` and `pnpm start`.

## Run it locally

Requirements: Node 20 or newer, a Postgres database (a Neon branch works well), and the API keys
for the services you want to exercise.

1. Install and create your env file:

   ```
   pnpm install
   cp .env.example .env      # on Windows PowerShell: Copy-Item .env.example .env
   ```

2. Fill in `.env`. See `.env.example` for every variable. For local development:
   - Keep `INNGEST_DEV=1` and leave `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` out. The local
     Inngest dev server needs no keys.
   - Set `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct). Both can be the same URL for a
     plain Postgres.

3. Create the tables:

   ```
   pnpm run db:push
   ```

4. Start the app and the Inngest dev server in two terminals:

   ```
   pnpm run dev            # the app on http://localhost:3000
   pnpm run inngest:dev    # the Inngest dev server and its UI on http://localhost:8288
   ```

   The dev server finds the app at `http://localhost:3000/api/inngest`. Open
   http://localhost:8288 to see the registered functions, events and step-by-step runs.

   The app serves the built dashboard at http://localhost:3000/dashboard/. For live frontend
   work, run `pnpm dev:web` in a third terminal and open http://localhost:5173/dashboard/; Vite
   proxies `/api` to the app on port 3000.

5. Check it:
   - `curl localhost:3000/api/inngest` should report `"mode":"dev"` and `"function_count":10`
     (five functions plus their failure handlers).
   - In the Inngest UI, open Functions and invoke or inspect runs.
   - `pnpm test` runs the unit tests. The database tests need `DATABASE_URL` pointing at a database
     with the schema pushed, and are skipped without it.

### Talking to a real chat from your machine

The platforms can only call a public URL, so expose port 3000 with a tunnel (for example
`ngrok http 3000`) and register the tunnel URL:

- **Telegram:** call `setWebhook` with the same secret as `TELEGRAM_WEBHOOK_SECRET`:

  ```
  curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
    -d "url=https://<tunnel>/telegram/webhook" \
    -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
  ```

- **Linq:** switched off. To try it locally, follow [docs/linq.md](docs/linq.md).

Use a separate bot for development, so you don't take over production traffic. A Telegram bot has
only one webhook at a time.

## Set it up in the cloud

1. **Database.** Create a Neon project and put its pooled connection string in `DATABASE_URL` and
   its direct one in `DATABASE_URL_UNPOOLED`. Run `pnpm run db:push` once against it from your
   machine before the first deploy.

2. **Third-party services.** Create the accounts and keys listed in `.env.example`:
   - Clerk: a confidential OAuth app with the Device Authorization Grant enabled (for account
     linking), plus billing with a `pro` plan. Users without an active Pro subscription are asked
     to upgrade.
   - Telegram bot, Daytona, Firecrawl, and an OpenAI-compatible API for the model
     (`OPENAI_BASEURL`, `OPENAI_MODEL`, `OPENAI_API_KEY`). Linq is off, so it needs no setup (see
     [docs/linq.md](docs/linq.md)).
   - Sentry (optional): set `SENTRY_DSN`.

3. **Vercel.**
   - Import the repository. Keep Fluid compute on (the default), which allows 300 seconds per
     request on Hobby. `checkpointing.maxRuntime` in `src/inngest/client.ts` stays below that.
   - Add every variable from `.env.example` in the project's environment settings, except
     `INNGEST_DEV`, which stays unset in production.
   - Turn off Deployment Protection for the project, or give Inngest the bypass secret in the
     integration settings (next step). Protection blocks Inngest's calls to `/api/inngest`.

4. **Inngest Cloud.**
   - Create an account and install Inngest's Vercel integration for the project. It sets
     `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` on Vercel for you and syncs the functions on each
     deploy. Without the integration, create an event key and copy the signing key from the Inngest
     dashboard, add both in Vercel, and sync the app from Inngest's Apps page using
     `https://<your-domain>/api/inngest`.
   - After a deploy, the app should appear under Apps with all ten functions, including the
     `sweep-inbox` and `sweep-reminders` crons.

5. **Webhooks.** Point the platforms at your production domain, using the same secrets as your
   Vercel variables:
   - Telegram: `setWebhook` with `url=https://<your-domain>/telegram/webhook` and
     `secret_token=<TELEGRAM_WEBHOOK_SECRET>`.
   - Linq is off: `/linq/webhook` answers 404 until `LINQ_ENABLED=true` (see docs/linq.md).

6. **Smoke test.** Message the bot from an unlinked account. You should get a sign-in link. After
   signing in, and with a Pro subscription, send another message and watch the run in the Inngest
   dashboard.

### Notes

- Keep local and production Inngest keys separate. Never copy production keys into your local
  `.env`, or local values into Vercel.
- Vercel Hobby is meant for non-commercial use. Check its terms if the app takes payments.
- Message text and replies live in Inngest's step state while a run is in flight.
- `AGENTS.md` has the conventions for working in this repository.
