import { Hono } from 'hono'
import telegram from './telegram.js'
import test from './test.js'

const app = new Hono()

app.route('/telegram', telegram)
app.route('/test', test)

app.get('/', (c) => {
  return c.text('Hello Railway!')
})

app.get('/marco', (c) => {
  return c.text('polo')
})

export default app
