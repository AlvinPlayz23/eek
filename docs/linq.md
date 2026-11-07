# Linq (iMessage): switched off

Telegram is the only chat platform that is live right now. Linq (iMessage) is switched off, not
removed: all of its code, its database values and its `LINQ_*` secrets stay in place.

## What "off" means

The switch is the environment variable `LINQ_ENABLED`, read by `src/platforms.ts`. It is off unless
it is exactly `true`.

While it is off:

- `POST /linq/webhook` answers `404` before any signature check, so nothing from Linq reaches the
  agent. Linq doesn't redeliver `4xx` responses, so a webhook still pointed here stops quickly.
- The inbox sweeper (`sweep-inbox`) ignores Linq conversations.
- No Linq events are produced, so no Linq account-linking or agent runs start.
- Telegram is unaffected.

What stays as it was: `src/linq-webhook.ts`, `src/inngest/linq-api.ts`, the Linq entry in
`src/inngest/channels.ts`, the `linq` value of `PLATFORMS` in `src/db/schema.ts` (so no database
change is needed either way), and existing `linq` rows in `channel_identifiers`, `chat_inbox`,
`chat_transcripts` and `chat_locks`.

## Turn it back on

1. **Environment.** Set these on Vercel (or in `.env` locally), then redeploy:

   ```
   LINQ_ENABLED=true
   LINQ_API_V3_API_KEY=<your Linq API key>
   LINQ_WEBHOOK_SECRET=<signing secret of the webhook subscription>
   ```

   The two `LINQ_*` variables are listed in `.env.example`. Changing a Vercel variable needs a new
   deployment to take effect.

2. **Webhook.** In Linq, create or update the webhook subscription for `message.received` events so
   it points at `https://<your-domain>/linq/webhook`. Its signing secret is `LINQ_WEBHOOK_SECRET`.

3. **Check it.**
   - `curl -i -X POST https://<your-domain>/linq/webhook` should now answer `401` (invalid
     signature) instead of `404`.
   - Text the Linq line. An unlinked number gets the sign-in link, and a linked Pro user gets an
     answer. Runs show up in the Inngest dashboard.

4. **Optional.** Conversations that were queued for Linq while it was off are picked up by the
   sweeper within about 15 minutes of turning it back on, or by the user's next message.

## Turn it off again

Remove `LINQ_ENABLED` (or set it to anything other than `true`) and redeploy. Re-pointing or
deleting the Linq webhook subscription is optional, since the `404` already stops it.

## Removing Linq for good

Only if you decide to drop it: delete `src/linq-webhook.ts`, `src/inngest/linq-api.ts`,
`src/inngest/inbound.ts`'s `parseLinqMessage`, the `linq` entries in `src/inngest/channels.ts` and
`src/inngest/link-account.ts`, the `@linqapp/sdk` dependency and the `linq` value in `PLATFORMS`
(after clearing its rows). That is a separate change.
