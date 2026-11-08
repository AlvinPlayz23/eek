import * as Sentry from '@sentry/node'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { serve } from 'inngest/hono'
import { dashboard } from './dashboard/index.js'
import { functions, inngest } from './inngest/index.js'
import { linqWebhook } from './linq-webhook.js'
import { requirePlatform } from './platforms.js'
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

// The dashboard is a Vite build in public/dashboard. Its assets are hashed and can be cached
// forever; the app itself is client-routed, so only its index page needs the server
app.get('/dashboard', (c) => c.redirect('/dashboard/'))
app.use('/dashboard/*', serveStatic({ root: './public' }))

// Web dashboard API and sign-in: JSON only, authenticated with the app's own signed cookie
app.route('/api/dashboard', dashboard)

app.route('/telegram/webhook', telegramWebhook)
// Linq (iMessage) is switched off unless LINQ_ENABLED=true; see docs/linq.md
app.use('/linq/webhook', requirePlatform('linq'))
app.route('/linq/webhook', linqWebhook)

// Inngest calls the agent's functions here: signed requests that run one or more steps of a run
app.on(['GET', 'POST', 'PUT'], '/api/inngest', serve({ client: inngest, functions }))

export default app
