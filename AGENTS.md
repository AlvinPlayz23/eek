## Hono CLI

Run `npx hono --help` first, and use the CLI instead of a dev server.

## Database schema changes

Do not use Drizzle migrations (`drizzle-kit generate` / `drizzle-kit migrate`). Edit `src/db/schema.ts` and apply it with `npm run db:push`.

## Vercel environment variables

The app is deployed on Vercel and its Inngest functions are synced by Inngest's Vercel integration, which sets `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` on the project. When syncing environment variables to Vercel (e.g. "sync environment variables" via the Vercel CLI/MCP), always exclude `INNGEST_DEV`, `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`. The local values are for the dev server and must never overwrite the integration's production keys. Do not set, update, or delete them on Vercel unless explicitly asked to change that specific variable.

## Inngest

Background work runs as Inngest functions in `src/inngest/` (served at `/api/inngest`). Read the Inngest docs for the installed `inngest` v4 before changing them; the TypeScript SDK reference is at https://www.inngest.com/docs/reference/typescript/v4. Function code is replayed on every step, so keep anything non-deterministic (clock, randomness, network) inside `step.run`. Run the local dev server with `npm run inngest:dev` next to `npm run dev`, with `INNGEST_DEV=1` in `.env`.
