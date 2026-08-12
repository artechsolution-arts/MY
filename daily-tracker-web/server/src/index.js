const path = require('node:path')
const express = require('express')
const cookieParser = require('cookie-parser')

const app = express()
app.set('trust proxy', 1)
app.use(express.json())
app.use(cookieParser())

app.get('/api/health', (req, res) => res.json({ ok: true }))
app.use('/api/auth', require('./routes/auth'))
app.use('/api/notes', require('./routes/notes'))
app.use('/api/reminders', require('./routes/reminders'))
app.use('/api/breaks', require('./routes/breaks'))

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
app.listen(port, () => console.log(`Daily Tracker API listening on :${port}`))
