const express = require('express')
const { pool } = require('../db')
const { requireAuth } = require('../auth')

const router = express.Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT content FROM notes WHERE user_id = $1', [req.userId])
  res.json({ content: rows[0]?.content ?? '' })
})

router.put('/', async (req, res) => {
  const { content } = req.body ?? {}
  if (typeof content !== 'string') return res.status(400).json({ error: 'content must be a string' })
  await pool.query(
    `INSERT INTO notes (user_id, content, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (user_id) DO UPDATE SET content = $2, updated_at = now()`,
    [req.userId, content],
  )
  res.json({ content })
})

module.exports = router
