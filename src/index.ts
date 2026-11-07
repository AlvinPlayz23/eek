// Vercel's entrypoint: it serves the default export. Sentry is initialized first, before anything
// it should instrument is imported
import './instrument.js'
import app from './app.js'

export default app
