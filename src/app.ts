import { Hono } from 'hono'
import { telegramWebhook } from './telegram-webhook.js'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Railway!')
})

app.route('/telegram/webhook', telegramWebhook)

export default app
