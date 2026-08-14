const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const SECRET = process.env.JWT_SECRET
if (!SECRET) throw new Error('JWT_SECRET env var is required')

const COOKIE_NAME = 'token'
const IS_PROD = process.env.NODE_ENV === 'production'
const COOKIE_OPTS = {
  httpOnly: true,
  // 'none' is required for the cross-origin mobile app's cookie to be sent at all,
  // and 'none' itself requires 'secure' — 'lax' + non-secure keeps plain-HTTP local dev working.
  sameSite: IS_PROD ? 'none' : 'lax',
  secure: IS_PROD,
  maxAge: 400 * 24 * 60 * 60 * 1000, // 400 days — the max Chrome allows; refreshed below so an active user never hits it
}

function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

function setSession(res, userId) {
  const token = jwt.sign({ sub: userId }, SECRET, { expiresIn: '400d' })
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
    setSession(res, payload.sub) // sliding expiration — stays logged in indefinitely while actively used
    next()
  } catch {
    return res.status(401).json({ error: 'Session expired' })
  }
}

module.exports = { hashPassword, verifyPassword, setSession, clearSession, requireAuth }
