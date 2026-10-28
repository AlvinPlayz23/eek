import { timingSafeEqual } from 'node:crypto'
import { Hono } from 'hono'

type Message = {
  message_id: number
  chat: { id: number }
}

type Update = {
  update_id: number
  message?: Message
}

const telegram = new Hono()

const isValidSecret = (received: string | undefined) => {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!expected || !received) return false
  const a = Buffer.from(received)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

// Echo by copying the message back, so any kind (text, photo, sticker, voice...) is returned as-is
const copyMessage = async (message: Message) => {
  const res = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/copyMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: message.chat.id,
        from_chat_id: message.chat.id,
        message_id: message.message_id
      })
    }
  )
  if (!res.ok) {
    console.error('copyMessage failed:', res.status, await res.text())
  }
}

telegram.post('/webhook', async (c) => {
  if (!isValidSecret(c.req.header('X-Telegram-Bot-Api-Secret-Token'))) {
    return c.text('Unauthorized', 401)
  }

  const update = await c.req.json<Update>()

  if (update.message) {
    await copyMessage(update.message)
  }

  // Always acknowledge, otherwise Telegram keeps retrying the update
  return c.body(null, 200)
})

export default telegram
