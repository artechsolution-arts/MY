// Pure timing logic — ported from the desktop app's scheduler_logic.py so both
// clients agree on when something is "due". Kept dependency-free and testable.

export function dueBreak(lastFiredTs: number, intervalMin: number, nowTs: number): boolean {
  if (intervalMin <= 0) return false
  return nowTs - lastFiredTs >= intervalMin * 60
}

export function dateStr(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function dueReminder(timeStr: string, lastFiredDate: string | null, now: Date): boolean {
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}` === timeStr && lastFiredDate !== dateStr(now)
}

/** Once-a-day "start your day" greeting — due any time it hasn't already fired today. */
export function dueMotivationStartup(lastFiredDate: string | null, now: Date): boolean {
  return lastFiredDate !== dateStr(now)
}

/** 0..1 progress toward a break's next firing, for the breathing-ring arc. */
export function breakProgress(lastFiredTs: number, intervalMin: number, nowTs: number): number {
  if (intervalMin <= 0) return 0
  const elapsed = nowTs - lastFiredTs
  return Math.min(1, Math.max(0, elapsed / (intervalMin * 60)))
}

/** Whether break notifications should stay silent right now (reminders are unaffected — those are explicit appointments, not ambient nudges). */
export function inQuietHours(now: Date, enabled: boolean, start: string, end: string, skipWeekends: boolean): boolean {
  if (!enabled) return false
  const day = now.getDay() // 0 = Sunday, 6 = Saturday
  if (skipWeekends && (day === 0 || day === 6)) return true

  const [startH, startM] = start.split(':').map(Number)
  const [endH, endM] = end.split(':').map(Number)
  const startMin = startH * 60 + startM
  const endMin = endH * 60 + endM
  const curMin = now.getHours() * 60 + now.getMinutes()

  if (startMin === endMin) return false // zero-width window = never quiet
  if (startMin < endMin) return curMin >= startMin && curMin < endMin
  return curMin >= startMin || curMin < endMin // window wraps past midnight
}
