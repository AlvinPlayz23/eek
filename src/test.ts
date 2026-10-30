import { Hono } from 'hono'
import { runs, tasks } from '@trigger.dev/sdk'
import type { generateTextTask } from './trigger/generate-text.js'

// Temporary, unauthenticated routes for manual testing. Remove before going live.
const test = new Hono()

test.get('/ai', async (c) => {
  const prompt = c.req.query('prompt') || 'Say hello in one short sentence.'

  const handle = await tasks.trigger<typeof generateTextTask>('generate-text', { prompt })
  const run = await runs.poll(handle, { pollIntervalMs: 1000 })

  if (!run.isSuccess || !run.output) {
    return c.json({ runId: run.id, status: run.status }, 500)
  }

  return c.json({ runId: run.id, prompt, text: run.output.text })
})

export default test
