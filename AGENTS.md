## Hono CLI

Run `npx hono --help` first, and use the CLI instead of a dev server.

## Railway environment variables

When syncing environment variables to Railway (e.g. "sync environment variables" via the Railway skill/MCP), always exclude `TRIGGER_SECRET_KEY`. The local value is a dev key and must never overwrite Railway's production `TRIGGER_SECRET_KEY`. Do not set, update, or delete it on Railway unless explicitly asked to change that specific variable.
