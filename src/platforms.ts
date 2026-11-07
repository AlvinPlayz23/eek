import type { MiddlewareHandler } from 'hono'
import type { Platform } from './db/schema.js'

// Which chat platforms are switched on. Telegram always is; Linq (iMessage) is off unless
// LINQ_ENABLED=true. A disabled platform keeps all its code, tables and secrets: it just isn't
// reachable (see docs/linq.md for turning it back on)
export const isPlatformEnabled = (platform: Platform) =>
  platform === 'linq' ? process.env.LINQ_ENABLED === 'true' : true

// Answers 404 while the platform is off. Linq redelivers 5xx responses for 30 minutes but not 4xx
// ones, so a webhook still pointed here stops instead of piling up retries
export const requirePlatform =
  (platform: Platform): MiddlewareHandler =>
  async (c, next) => (isPlatformEnabled(platform) ? next() : c.text('Not found', 404))
