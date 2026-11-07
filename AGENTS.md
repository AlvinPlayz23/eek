## Hono CLI

Run `npx hono --help` first, and use the CLI instead of a dev server.

## Database schema changes

Do not use Drizzle migrations (`drizzle-kit generate` / `drizzle-kit migrate`). Edit `src/db/schema.ts` and apply it with `npm run db:push`.

## Vercel environment variables

The app is deployed on Vercel and its Inngest functions are synced by Inngest's Vercel integration, which sets `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` on the project. When syncing environment variables to Vercel (e.g. "sync environment variables" via the Vercel CLI/MCP), always exclude `INNGEST_DEV`, `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`. The local values are for the dev server and must never overwrite the integration's production keys. Do not set, update, or delete them on Vercel unless explicitly asked to change that specific variable.

## Inngest

Background work runs as Inngest functions in `src/inngest/` (served at `/api/inngest`). Read the Inngest docs for the installed `inngest` v4 before changing them; the TypeScript SDK reference is at https://www.inngest.com/docs/reference/typescript/v4. Function code is replayed on every step, so keep anything non-deterministic (clock, randomness, network) inside `step.run`. Run the local dev server with `npm run inngest:dev` next to `npm run dev`, with `INNGEST_DEV=1` in `.env`.

## Greptile review for security-critical changes

Whenever a change touches a security-critical layer, run a Greptile review of the local branch before considering the work done (use the `greptile-cli` skill; `greptile review --json`). Triage every finding against the actual code, fix what holds up, and re-review, following the `greploop` skill. Report any findings you rejected or deferred, with the reason.

Security-critical layers in this app:

- **Webhook ingress and verification**: `src/app.ts` routing, `src/telegram-webhook.ts`, `src/linq-webhook.ts`, and `secretMatches` / signature checks in `src/channel-gate.ts`.
- **Access gating**: `src/channel-gate.ts` (who reaches the agent) and `src/billing.ts` (Pro plan checks, Clerk Backend API calls).
- **Identity and account linking**: `src/inngest/link-account.ts` (Clerk OAuth device flow), `src/db/channel-links.ts`, and the `channelIdentifiers` table in `src/db/schema.ts`.
- **Agent tools with code execution or outbound access**: `src/inngest/computer-tools.ts` (Daytona sandbox, file transfer), `src/inngest/web-tools.ts`, and the tool wiring in `src/inngest/agent-tools.ts` and `src/inngest/chat-turn.ts`.
- **Outbound messaging**: `src/inngest/channels.ts`, `src/inngest/telegram-api.ts`, `src/inngest/linq-api.ts` (who a message is sent to).
- **Secrets and config**: anything that reads, logs, or forwards API keys or tokens, plus `src/instrument.ts` and environment-variable handling.
- **Database access**: `src/db/` queries (including `src/db/chat.ts`: the inbox, per-user lock and transcripts) that filter by user, platform, or external ID, and any schema change affecting user or link data.

Also run the review for any new file that adds a webhook route, an auth or plan check, an agent tool, or handling of secrets, even if it isn't listed above. Changes that only edit user-facing message wording or comments in these files don't need a review.

If `greptile` isn't installed or authenticated, say so and ask the user instead of skipping the review silently.
