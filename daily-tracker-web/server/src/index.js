const path = require('node:path')
const fs = require('node:fs')
const express = require('express')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const { pool } = require('./db')

const app = express()
app.set('trust proxy', 1)
// Express auto-ETags every res.json() reply and answers a matching
// If-None-Match with a bodyless 304. Browsers send that header on repeat
// GETs whether or not the caller wants caching, so an unchanged /auth/me
// (nothing to do with actually being logged in) came back as a 304 --
// which fetch() treats as a failure (res.ok is false), making a perfectly
// valid session look logged-out. API responses aren't meant to be cached
// this way; static asset caching below is unaffected (separate mechanism).
app.disable('etag')
app.use(express.json())
app.use(cookieParser())
// The mobile app's web content is bundled locally and runs from a different
// origin (Capacitor's default WebView origin), so its API calls are
// cross-origin -- unlike the website, which is same-origin and unaffected
// by this either way.
app.use(cors({ origin: ['https://localhost', 'capacitor://localhost'], credentials: true }))

app.get('/api/health', (req, res) => res.json({ ok: true }))
app.use('/api/auth', require('./routes/auth'))
app.use('/api/notes', require('./routes/notes'))
app.use('/api/reminders', require('./routes/reminders'))
app.use('/api/breaks', require('./routes/breaks'))
app.use('/api/settings', require('./routes/settings'))

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Something went wrong' })
})

const clientDist = path.join(__dirname, '..', '..', 'client', 'dist')
app.use(express.static(clientDist))
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next()
  res.sendFile(path.join(clientDist, 'index.html'))
})

const port = process.env.PORT || 8787

async function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8')
  await pool.query(schema) // CREATE TABLE IF NOT EXISTS — safe to run on every boot
}

migrate()
  .then(() => app.listen(port, () => console.log(`Daily Tracker API listening on :${port}`)))
  .catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
