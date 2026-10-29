import { timingSafeEqual } from 'node:crypto'
import { Hono } from 'hono'
import { generateText } from 'ai'
import { neon } from '@neon/ai-sdk-provider'

type Message = {
  message_id: number
  chat: { id: number }
  text?: string
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

const sendMessage = async (chatId: number, text: string) => {
  const res = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    }
  )
  if (!res.ok) {
    console.error('sendMessage failed:', res.status, await res.text())
  }
}

const reply = async (message: Message) => {
  if (!message.text) {
    await sendMessage(message.chat.id, 'I can only read text messages for now.')
    return
  }

  try {
    const { text } = await generateText({
      model: neon('gpt-5-4-nano'),
      instructions: 'You are a helpful, concise personal assistant chatting over Telegram.',
      prompt: message.text
    })
    await sendMessage(message.chat.id, text)
  } catch (err) {
    console.error('generateText failed:', err)
    await sendMessage(message.chat.id, 'Sorry, something went wrong. Please try again.')
  }
}

telegram.post('/webhook', async (c) => {
  if (!isValidSecret(c.req.header('X-Telegram-Bot-Api-Secret-Token'))) {
    return c.text('Unauthorized', 401)
  }

  const update = await c.req.json<Update>()

  if (update.message) {
    await reply(update.message)
  }

  // Always acknowledge, otherwise Telegram keeps retrying the update
  return c.body(null, 200)
})

export default telegram
