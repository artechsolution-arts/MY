const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const SECRET = process.env.JWT_SECRET
if (!SECRET) throw new Error('JWT_SECRET env var is required')

const COOKIE_NAME = 'token'
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
}

function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

function setSession(res, userId) {
  const token = jwt.sign({ sub: userId }, SECRET, { expiresIn: '30d' })
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS)
}

function clearSession(res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: COOKIE_OPTS.httpOnly, sameSite: COOKIE_OPTS.sameSite, secure: COOKIE_OPTS.secure })
}

function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME]
  if (!token) return res.status(401).json({ error: 'Not logged in' })
  try {
    const payload = jwt.verify(token, SECRET)
    req.userId = payload.sub
    next()
  } catch {
    return res.status(401).json({ error: 'Session expired' })
  }
}

module.exports = { hashPassword, verifyPassword, setSession, clearSession, requireAuth }
