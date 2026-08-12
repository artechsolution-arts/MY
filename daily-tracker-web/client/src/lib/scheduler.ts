// Pure timing logic — ported from the desktop app's scheduler_logic.py so both
// clients agree on when something is "due". Kept dependency-free and testable.

export function dueBreak(lastFiredTs: number, intervalMin: number, nowTs: number): boolean {
  if (intervalMin <= 0) return false
  return nowTs - lastFiredTs >= intervalMin * 60
}

export function dueReminder(timeStr: string, lastFiredDate: string | null, now: Date): boolean {
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return `${hh}:${mm}` === timeStr && lastFiredDate !== today
}

/** 0..1 progress toward a break's next firing, for the breathing-ring arc. */
export function breakProgress(lastFiredTs: number, intervalMin: number, nowTs: number): number {
  if (intervalMin <= 0) return 0
  const elapsed = nowTs - lastFiredTs
  return Math.min(1, Math.max(0, elapsed / (intervalMin * 60)))
}
