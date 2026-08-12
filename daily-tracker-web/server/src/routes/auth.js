const express = require('express')
const { pool } = require('../db')
const { hashPassword, verifyPassword, setSession, clearSession, requireAuth } = require('../auth')
const { DEFAULT_BREAKS } = require('../constants')

const router = express.Router()

router.post('/signup', async (req, res) => {
  const { email, password } = req.body ?? {}
  if (typeof email !== 'string' || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Email and an 8+ character password are required' })
  }
  const client = await pool.connect()
  try {
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()])
    if (existing.rowCount > 0) return res.status(409).json({ error: 'An account with that email already exists' })

    const passwordHash = await hashPassword(password)
    await client.query('BEGIN')
    const { rows } = await client.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email.toLowerCase(), passwordHash],
    )
    const user = rows[0]
    await client.query('INSERT INTO notes (user_id, content) VALUES ($1, $2)', [user.id, ''])
    for (const [type, defaults] of Object.entries(DEFAULT_BREAKS)) {
      await client.query(
        'INSERT INTO breaks (user_id, type, label, interval_min, message) VALUES ($1, $2, $3, $4, $5)',
        [user.id, type, defaults.label, defaults.interval_min, defaults.message],
      )
    }
    await client.query('COMMIT')

    setSession(res, user.id)
    res.status(201).json({ user })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Could not create account' })
  } finally {
    client.release()
  }
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {}
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' })
  }
  const { rows } = await pool.query('SELECT id, email, password_hash FROM users WHERE email = $1', [email.toLowerCase()])
  const user = rows[0]
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ error: 'Wrong email or password' })
  }
  setSession(res, user.id)
  res.json({ user: { id: user.id, email: user.email } })
})

router.post('/logout', (req, res) => {
  clearSession(res)
  res.status(204).end()
})

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT id, email FROM users WHERE id = $1', [req.userId])
  if (!rows[0]) return res.status(401).json({ error: 'Not logged in' })
  res.json({ user: rows[0] })
})

module.exports = router
