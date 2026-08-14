const express = require('express')
const { pool } = require('../db')
const { requireAuth } = require('../auth')

const router = express.Router()
router.use(requireAuth)

const TIME_RE = /^\d{2}:\d{2}$/
const SETTINGS_COLUMNS = `
  quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_skip_weekends,
  mobile_quiet_hours_enabled, mobile_quiet_hours_start, mobile_quiet_hours_end, mobile_quiet_hours_skip_weekends,
  motivation_enabled, motivation_on_startup, motivation_interval_min,
  motivation_last_fired_date, motivation_last_fired_ts
`

router.get('/', async (req, res) => {
  const { rows } = await pool.query(`SELECT ${SETTINGS_COLUMNS} FROM users WHERE id = $1`, [req.userId])
  res.json({ settings: rows[0] })
})

router.put('/', async (req, res) => {
  const {
    quiet_hours_enabled,
    quiet_hours_start,
    quiet_hours_end,
    quiet_hours_skip_weekends,
    mobile_quiet_hours_enabled,
    mobile_quiet_hours_start,
    mobile_quiet_hours_end,
    mobile_quiet_hours_skip_weekends,
    motivation_enabled,
    motivation_on_startup,
    motivation_interval_min,
  } = req.body ?? {}
  if (typeof quiet_hours_enabled !== 'boolean') return res.status(400).json({ error: 'quiet_hours_enabled must be a boolean' })
  if (!TIME_RE.test(quiet_hours_start ?? '')) return res.status(400).json({ error: 'quiet_hours_start must be HH:MM' })
  if (!TIME_RE.test(quiet_hours_end ?? '')) return res.status(400).json({ error: 'quiet_hours_end must be HH:MM' })
  if (typeof quiet_hours_skip_weekends !== 'boolean') return res.status(400).json({ error: 'quiet_hours_skip_weekends must be a boolean' })
  if (typeof mobile_quiet_hours_enabled !== 'boolean') return res.status(400).json({ error: 'mobile_quiet_hours_enabled must be a boolean' })
  if (!TIME_RE.test(mobile_quiet_hours_start ?? '')) return res.status(400).json({ error: 'mobile_quiet_hours_start must be HH:MM' })
  if (!TIME_RE.test(mobile_quiet_hours_end ?? '')) return res.status(400).json({ error: 'mobile_quiet_hours_end must be HH:MM' })
  if (typeof mobile_quiet_hours_skip_weekends !== 'boolean') return res.status(400).json({ error: 'mobile_quiet_hours_skip_weekends must be a boolean' })
  if (typeof motivation_enabled !== 'boolean') return res.status(400).json({ error: 'motivation_enabled must be a boolean' })
  if (typeof motivation_on_startup !== 'boolean') return res.status(400).json({ error: 'motivation_on_startup must be a boolean' })
  if (!Number.isInteger(motivation_interval_min) || motivation_interval_min < 15 || motivation_interval_min > 720) {
    return res.status(400).json({ error: 'motivation_interval_min must be between 15 and 720' })
  }

  const { rows } = await pool.query(
    `UPDATE users SET
       quiet_hours_enabled = $1, quiet_hours_start = $2, quiet_hours_end = $3, quiet_hours_skip_weekends = $4,
       mobile_quiet_hours_enabled = $5, mobile_quiet_hours_start = $6, mobile_quiet_hours_end = $7, mobile_quiet_hours_skip_weekends = $8,
       motivation_enabled = $9, motivation_on_startup = $10, motivation_interval_min = $11
     WHERE id = $12
     RETURNING ${SETTINGS_COLUMNS}`,
    [
      quiet_hours_enabled,
      quiet_hours_start,
      quiet_hours_end,
      quiet_hours_skip_weekends,
      mobile_quiet_hours_enabled,
      mobile_quiet_hours_start,
      mobile_quiet_hours_end,
      mobile_quiet_hours_skip_weekends,
      motivation_enabled,
      motivation_on_startup,
      motivation_interval_min,
      req.userId,
    ],
  )
  res.json({ settings: rows[0] })
})

router.post('/motivation/fire', async (req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const nowTs = Date.now() / 1000
  await pool.query('UPDATE users SET motivation_last_fired_date = $1, motivation_last_fired_ts = $2 WHERE id = $3', [
    today,
    nowTs,
    req.userId,
  ])
  res.json({ motivation_last_fired_date: today, motivation_last_fired_ts: nowTs })
})

module.exports = router
