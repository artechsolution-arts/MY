const express = require('express')
const { pool } = require('../db')
const { requireAuth } = require('../auth')

const router = express.Router()
router.use(requireAuth)

const TYPES = new Set(['breathe', 'rest', 'stand'])

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT type, label, enabled, interval_min, message, last_fired_ts FROM breaks WHERE user_id = $1',
    [req.userId],
  )
  const breaks = {}
  for (const row of rows) {
    const { type, ...rest } = row
    breaks[type] = rest
  }
  res.json({ breaks })
})

router.put('/:type', async (req, res) => {
  if (!TYPES.has(req.params.type)) return res.status(404).json({ error: 'Unknown break type' })
  const { enabled, interval_min, message } = req.body ?? {}
  if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be a boolean' })
  if (!Number.isInteger(interval_min) || interval_min < 1 || interval_min > 480) {
    return res.status(400).json({ error: 'interval_min must be between 1 and 480' })
  }
  if (typeof message !== 'string' || !message.trim()) return res.status(400).json({ error: 'message is required' })

  const { rows } = await pool.query(
    `UPDATE breaks SET enabled = $1, interval_min = $2, message = $3
     WHERE user_id = $4 AND type = $5
     RETURNING label, enabled, interval_min, message, last_fired_ts`,
    [enabled, interval_min, message.trim(), req.userId, req.params.type],
  )
  if (!rows[0]) return res.status(404).json({ error: 'Break not found' })
  res.json({ break: rows[0] })
})

router.post('/:type/fire', async (req, res) => {
  if (!TYPES.has(req.params.type)) return res.status(404).json({ error: 'Unknown break type' })
  const nowTs = Date.now() / 1000
  await pool.query('UPDATE breaks SET last_fired_ts = $1 WHERE user_id = $2 AND type = $3', [nowTs, req.userId, req.params.type])
  res.json({ last_fired_ts: nowTs })
})

module.exports = router
