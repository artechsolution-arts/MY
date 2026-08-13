const express = require('express')
const { pool } = require('../db')
const { requireAuth } = require('../auth')

const router = express.Router()
router.use(requireAuth)

function validate(body) {
  const { label, enabled, interval_min, message } = body ?? {}
  if (typeof label !== 'string' || !label.trim()) return 'label is required'
  if (typeof enabled !== 'boolean') return 'enabled must be a boolean'
  if (!Number.isInteger(interval_min) || interval_min < 1 || interval_min > 480) {
    return 'interval_min must be between 1 and 480'
  }
  if (typeof message !== 'string' || !message.trim()) return 'message is required'
  return null
}

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, label, enabled, interval_min, message, last_fired_ts FROM breaks WHERE user_id = $1 ORDER BY created_at',
    [req.userId],
  )
  res.json({ breaks: rows })
})

router.post('/', async (req, res) => {
  const err = validate(req.body)
  if (err) return res.status(400).json({ error: err })
  const { label, enabled, interval_min, message } = req.body
  const { rows } = await pool.query(
    `INSERT INTO breaks (user_id, label, enabled, interval_min, message)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, label, enabled, interval_min, message, last_fired_ts`,
    [req.userId, label.trim(), enabled, interval_min, message.trim()],
  )
  res.status(201).json({ break: rows[0] })
})

router.put('/:id', async (req, res) => {
  const err = validate(req.body)
  if (err) return res.status(400).json({ error: err })
  const { label, enabled, interval_min, message } = req.body
  const { rows } = await pool.query(
    `UPDATE breaks SET label = $1, enabled = $2, interval_min = $3, message = $4
     WHERE id = $5 AND user_id = $6
     RETURNING id, label, enabled, interval_min, message, last_fired_ts`,
    [label.trim(), enabled, interval_min, message.trim(), req.params.id, req.userId],
  )
  if (!rows[0]) return res.status(404).json({ error: 'Break not found' })
  res.json({ break: rows[0] })
})

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM breaks WHERE id = $1 AND user_id = $2', [req.params.id, req.userId])
  res.status(204).end()
})

router.post('/:id/fire', async (req, res) => {
  const nowTs = Date.now() / 1000
  const { rows } = await pool.query(
    'UPDATE breaks SET last_fired_ts = $1 WHERE id = $2 AND user_id = $3 RETURNING id',
    [nowTs, req.params.id, req.userId],
  )
  if (!rows[0]) return res.status(404).json({ error: 'Break not found' })
  res.json({ last_fired_ts: nowTs })
})

module.exports = router
