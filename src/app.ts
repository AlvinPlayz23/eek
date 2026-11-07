import * as Sentry from '@sentry/node'
import { Hono } from 'hono'
import { serve } from 'inngest/hono'
import { functions, inngest } from './inngest/index.js'
import { linqWebhook } from './linq-webhook.js'
import { telegramWebhook } from './telegram-webhook.js'

const app = new Hono()

// Registered first: traces each request and reports unhandled 5xx errors. The automatic
// Hono integration does the same when instrument.ts is preloaded; requests are deduplicated.
app.use(Sentry.honoMiddleware(app))

// A serverless function can be frozen once it has answered, so what Sentry buffered is sent first
app.use(async (_c, next) => {
  await next()
  await Sentry.flush(2000)
})

app.get('/', (c) => {
  return c.text('Hello Vercel!')
})

app.route('/telegram/webhook', telegramWebhook)
app.route('/linq/webhook', linqWebhook)

// Inngest calls the agent's functions here: signed requests that run one or more steps of a run
app.on(['GET', 'POST', 'PUT'], '/api/inngest', serve({ client: inngest, functions }))

export default app
