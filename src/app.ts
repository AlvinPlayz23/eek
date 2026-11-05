import { Hono } from 'hono'
import { linqWebhook } from './linq-webhook.js'
import { telegramWebhook } from './telegram-webhook.js'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Railway!')
})

app.route('/telegram/webhook', telegramWebhook)
app.route('/linq/webhook', linqWebhook)

export default app
