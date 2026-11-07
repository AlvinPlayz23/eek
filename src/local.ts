// Runs the app as a plain Node server, for local development and any host that isn't Vercel
import { serve } from '@hono/node-server'
import app from './app.js'

serve({
  fetch: app.fetch,
  port: Number(process.env.PORT) || 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
