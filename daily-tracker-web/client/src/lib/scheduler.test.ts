import assert from 'node:assert'
import { dueBreak, dueReminder, breakProgress } from './scheduler.ts'

assert.strictEqual(dueBreak(0, 20, 20 * 60), true)
assert.strictEqual(dueBreak(0, 20, 19 * 60), false)
assert.strictEqual(dueBreak(100, 0, 999999), false) // interval 0 = disabled

const now = new Date(2026, 7, 12, 9, 30) // Aug 12 2026, 09:30 local
assert.strictEqual(dueReminder('09:30', null, now), true)
assert.strictEqual(dueReminder('09:30', '2026-08-12', now), false) // already fired today
assert.strictEqual(dueReminder('09:31', null, now), false)

assert.strictEqual(breakProgress(0, 20, 10 * 60), 0.5)
assert.strictEqual(breakProgress(0, 20, 30 * 60), 1) // clamped

console.log('OK')
