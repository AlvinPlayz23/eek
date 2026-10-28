import { Hono } from 'hono'
import telegram from './telegram.js'

const app = new Hono()

app.route('/telegram', telegram)

app.get('/', (c) => {
  return c.text('Hello Railway!')
})

app.get('/marco', (c) => {
  return c.text('polo')
})

export default app
