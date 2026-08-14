// Mobile-only: the web's JS-timer-based scheduler only runs while the page is
// open, which iOS/Android suspend the moment the app is backgrounded — so on
// native platforms, notifications are instead scheduled ahead of time via the
// OS's own alarm system (Capacitor LocalNotifications), refreshed each time
// the app opens. No-ops entirely on web/desktop (isNative is false there).
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { hashId, futureOccurrences } from './scheduler'
import { randomQuote } from './quotes'

export const isNative = Capacitor.isNativePlatform()

const LOOKAHEAD_MS = 3 * 24 * 60 * 60 * 1000 // re-extended every time the app is opened
const MAX_OCCURRENCES = 60 // sanity cap — avoids scheduling thousands of alarms if an interval is very short
const MOTIVATION_ID_BASE = 900_000 // reserved ID range, distinct from the hashed break/reminder IDs below

type BreakLike = { id: string; label: string; message: string; enabled: boolean; interval_min: number; last_fired_ts: number }
type ReminderLike = { id: string; title: string; category: string; time: string; enabled: boolean }
type QuietSettings = { quiet_hours_enabled: boolean; quiet_hours_start: string; quiet_hours_end: string; quiet_hours_skip_weekends: boolean }
type SettingsLike = QuietSettings & { motivation_enabled: boolean; motivation_interval_min: number; motivation_last_fired_ts: number }

export async function requestNativePermission() {
  if (!isNative) return
  await LocalNotifications.requestPermissions()
}

/** Fires (near-)immediately — used for "Test now" and any in-app manual trigger. */
export async function fireNativeNow(title: string, body: string) {
  await LocalNotifications.schedule({
    notifications: [{ id: Math.floor(Math.random() * 1_000_000), title, body, schedule: { at: new Date(Date.now() + 500) } }],
  })
}

/** Cancels everything pending and reschedules from current data — the source of truth after every change. */
export async function scheduleNativeNotifications(breaks: BreakLike[], reminders: ReminderLike[], settings: SettingsLike) {
  if (!isNative) return

  const pending = await LocalNotifications.getPending()
  if (pending.notifications.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) })
  }

  const toSchedule: Parameters<typeof LocalNotifications.schedule>[0]['notifications'] = []
  const nowMs = Date.now()

  for (const b of breaks) {
    if (!b.enabled) continue
    const startAt = (b.last_fired_ts || nowMs / 1000) * 1000 + b.interval_min * 60_000
    futureOccurrences(startAt, b.interval_min * 60_000, settings, nowMs, LOOKAHEAD_MS, MAX_OCCURRENCES).forEach((t, i) => {
      toSchedule.push({ id: hashId(b.id) * 1000 + i, title: b.label, body: b.message, schedule: { at: new Date(t), allowWhileIdle: true } })
    })
  }

  for (const r of reminders) {
    if (!r.enabled) continue
    const [hour, minute] = r.time.split(':').map(Number)
    // Native daily-recurring alarm — reminders aren't muted by quiet hours (explicit appointments), and this repeats indefinitely without needing a lookahead refresh.
    toSchedule.push({
      id: hashId(r.id),
      title: `${r.category}: ${r.title}`,
      body: r.title,
      schedule: { on: { hour, minute }, allowWhileIdle: true },
    })
  }

  if (settings.motivation_enabled) {
    const startAt = (settings.motivation_last_fired_ts || nowMs / 1000) * 1000 + settings.motivation_interval_min * 60_000
    futureOccurrences(startAt, settings.motivation_interval_min * 60_000, settings, nowMs, LOOKAHEAD_MS, MAX_OCCURRENCES).forEach((t, i) => {
      toSchedule.push({ id: MOTIVATION_ID_BASE + i, title: 'Keep going', body: randomQuote(), schedule: { at: new Date(t), allowWhileIdle: true } })
    })
  }

  if (toSchedule.length) await LocalNotifications.schedule({ notifications: toSchedule })
}
