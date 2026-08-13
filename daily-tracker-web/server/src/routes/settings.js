const express = require('express')
const { pool } = require('../db')
const { requireAuth } = require('../auth')

const router = express.Router()
router.use(requireAuth)

const TIME_RE = /^\d{2}:\d{2}$/

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_skip_weekends FROM users WHERE id = $1',
    [req.userId],
  )
  res.json({ quietHours: rows[0] })
})

router.put('/', async (req, res) => {
  const { quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_skip_weekends } = req.body ?? {}
  if (typeof quiet_hours_enabled !== 'boolean') return res.status(400).json({ error: 'quiet_hours_enabled must be a boolean' })
  if (!TIME_RE.test(quiet_hours_start ?? '')) return res.status(400).json({ error: 'quiet_hours_start must be HH:MM' })
  if (!TIME_RE.test(quiet_hours_end ?? '')) return res.status(400).json({ error: 'quiet_hours_end must be HH:MM' })
  if (typeof quiet_hours_skip_weekends !== 'boolean') return res.status(400).json({ error: 'quiet_hours_skip_weekends must be a boolean' })

  const { rows } = await pool.query(
    `UPDATE users SET quiet_hours_enabled = $1, quiet_hours_start = $2, quiet_hours_end = $3, quiet_hours_skip_weekends = $4
     WHERE id = $5
     RETURNING quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_skip_weekends`,
    [quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_skip_weekends, req.userId],
  )
  res.json({ quietHours: rows[0] })
})

module.exports = router
