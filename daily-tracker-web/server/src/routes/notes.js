const express = require('express')
const { pool } = require('../db')
const { requireAuth } = require('../auth')

const router = express.Router()
router.use(requireAuth)

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const today = () => new Date().toISOString().slice(0, 10)

router.get('/', async (req, res) => {
  const date = typeof req.query.date === 'string' && DATE_RE.test(req.query.date) ? req.query.date : today()
  const { rows } = await pool.query('SELECT content FROM notes WHERE user_id = $1 AND date = $2', [req.userId, date])
  res.json({ date, content: rows[0]?.content ?? '' })
})

// Dates with a non-empty entry, for the journal's calendar picker to mark.
router.get('/dates', async (req, res) => {
  const { rows } = await pool.query(`SELECT date FROM notes WHERE user_id = $1 AND content <> ''`, [req.userId])
  res.json({ dates: rows.map((r) => r.date) })
})

router.put('/', async (req, res) => {
  const { date, content } = req.body ?? {}
  if (!DATE_RE.test(date ?? '')) return res.status(400).json({ error: 'date must be YYYY-MM-DD' })
  if (typeof content !== 'string') return res.status(400).json({ error: 'content must be a string' })
  await pool.query(
    `INSERT INTO notes (user_id, date, content, updated_at) VALUES ($1, $2, $3, now())
     ON CONFLICT (user_id, date) DO UPDATE SET content = $3, updated_at = now()`,
    [req.userId, date, content],
  )
  res.json({ date, content })
})

module.exports = router
