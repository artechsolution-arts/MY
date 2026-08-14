import assert from 'node:assert'
import { dueBreak, dueReminder, breakProgress, inQuietHours, dueMotivationStartup, hashId, futureOccurrences } from './scheduler.ts'

assert.strictEqual(dueBreak(0, 20, 20 * 60), true)
assert.strictEqual(dueBreak(0, 20, 19 * 60), false)
assert.strictEqual(dueBreak(100, 0, 999999), false) // interval 0 = disabled

const now = new Date(2026, 7, 12, 9, 30) // Aug 12 2026, 09:30 local
assert.strictEqual(dueReminder('09:30', null, now), true)
assert.strictEqual(dueReminder('09:30', '2026-08-12', now), false) // already fired today
assert.strictEqual(dueReminder('09:31', null, now), false)

assert.strictEqual(breakProgress(0, 20, 10 * 60), 0.5)
assert.strictEqual(breakProgress(0, 20, 30 * 60), 1) // clamped

// Wed Aug 12 2026 (weekday) / Sat Aug 15 2026 (weekend) — confirmed against the calendar
const weekday10pm = new Date(2026, 7, 12, 22, 0)
const weekday7am = new Date(2026, 7, 12, 7, 0)
const weekday9am = new Date(2026, 7, 12, 9, 0)
const weekdayNoon = new Date(2026, 7, 12, 12, 0)
const saturdayNoon = new Date(2026, 7, 15, 12, 0)

assert.strictEqual(inQuietHours(weekday10pm, false, '21:00', '08:00', true), false) // disabled
assert.strictEqual(inQuietHours(weekday10pm, true, '21:00', '08:00', true), true) // overnight window, inside
assert.strictEqual(inQuietHours(weekday7am, true, '21:00', '08:00', true), true) // overnight window, before end
assert.strictEqual(inQuietHours(weekday9am, true, '21:00', '08:00', true), false) // overnight window, after end
assert.strictEqual(inQuietHours(saturdayNoon, true, '21:00', '08:00', true), true) // weekend, skip regardless of time
assert.strictEqual(inQuietHours(saturdayNoon, true, '21:00', '08:00', false), false) // weekend but not skipped, outside window
assert.strictEqual(inQuietHours(weekdayNoon, true, '09:00', '17:00', false), true) // normal (non-wrapping) window, inside
assert.strictEqual(inQuietHours(weekdayNoon, true, '09:00', '09:00', false), false) // zero-width window never quiet

assert.strictEqual(dueMotivationStartup(null, now), true) // never fired
assert.strictEqual(dueMotivationStartup('2026-08-12', now), false) // already fired today
assert.strictEqual(dueMotivationStartup('2026-08-11', now), true) // fired yesterday, due again

assert.strictEqual(hashId('abc'), hashId('abc')) // deterministic
assert.strictEqual(typeof hashId('abc'), 'number')
assert.ok(hashId('abc') >= 0 && hashId('abc') < 100_000) // always non-negative, in range
assert.notStrictEqual(hashId('abc'), hashId('abd')) // different ids hash differently (not a strict guarantee, but true for this pair)

const noQuiet = { quiet_hours_enabled: false, quiet_hours_start: '21:00', quiet_hours_end: '08:00', quiet_hours_skip_weekends: false }
const nowMs = new Date(2026, 7, 12, 9, 0).getTime() // Wed Aug 12 2026, 09:00
const hourMs = 60 * 60 * 1000

// three future hourly occurrences starting now
assert.deepStrictEqual(
  futureOccurrences(nowMs, hourMs, noQuiet, nowMs, 4 * hourMs, 10),
  [nowMs + hourMs, nowMs + 2 * hourMs, nowMs + 3 * hourMs, nowMs + 4 * hourMs],
)
// maxOccurrences caps the result
assert.strictEqual(futureOccurrences(nowMs, hourMs, noQuiet, nowMs, 24 * hourMs, 3).length, 3)
// occurrences at/before nowMs are excluded even if within range
assert.deepStrictEqual(futureOccurrences(nowMs - hourMs, hourMs, noQuiet, nowMs, hourMs, 10), [nowMs + hourMs])
// quiet hours skip matching occurrences (10:00 and 11:00 fall inside a 10:00-12:00 quiet window)
const quiet = { quiet_hours_enabled: true, quiet_hours_start: '10:00', quiet_hours_end: '12:00', quiet_hours_skip_weekends: false }
assert.deepStrictEqual(futureOccurrences(nowMs + hourMs, hourMs, quiet, nowMs, 4 * hourMs, 10), [nowMs + 3 * hourMs, nowMs + 4 * hourMs])

console.log('OK')
