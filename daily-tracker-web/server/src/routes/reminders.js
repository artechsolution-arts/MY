const express = require('express')
const { pool } = require('../db')
const { requireAuth } = require('../auth')

const router = express.Router()
router.use(requireAuth)

const CATEGORIES = new Set(['Work', 'Health', 'Other'])

function validate(body) {
  const { title, category, time, enabled } = body ?? {}
  if (typeof title !== 'string' || !title.trim()) return 'title is required'
  if (!CATEGORIES.has(category)) return 'category must be Work, Health, or Other'
  if (typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time)) return 'time must be HH:MM'
  if (typeof enabled !== 'boolean') return 'enabled must be a boolean'
  return null
}

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, title, category, time, enabled, last_fired_date FROM reminders WHERE user_id = $1 ORDER BY time',
    [req.userId],
  )
  res.json({ reminders: rows })
})

router.post('/', async (req, res) => {
  const err = validate(req.body)
  if (err) return res.status(400).json({ error: err })
  const { title, category, time, enabled } = req.body
  const { rows } = await pool.query(
    `INSERT INTO reminders (user_id, title, category, time, enabled)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, title, category, time, enabled, last_fired_date`,
    [req.userId, title.trim(), category, time, enabled],
  )
  res.status(201).json({ reminder: rows[0] })
})

router.put('/:id', async (req, res) => {
  const err = validate(req.body)
  if (err) return res.status(400).json({ error: err })
  const { title, category, time, enabled } = req.body
  const { rows } = await pool.query(
    `UPDATE reminders SET title = $1, category = $2, time = $3, enabled = $4
     WHERE id = $5 AND user_id = $6
     RETURNING id, title, category, time, enabled, last_fired_date`,
    [title.trim(), category, time, enabled, req.params.id, req.userId],
  )
  if (!rows[0]) return res.status(404).json({ error: 'Reminder not found' })
  res.json({ reminder: rows[0] })
})

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM reminders WHERE id = $1 AND user_id = $2', [req.params.id, req.userId])
  res.status(204).end()
})

router.post('/:id/fire', async (req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  await pool.query('UPDATE reminders SET last_fired_date = $1 WHERE id = $2 AND user_id = $3', [today, req.params.id, req.userId])
  res.json({ last_fired_date: today })
})

module.exports = router
