import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { api } from './api'
import { dueBreak, dueReminder, breakProgress } from './scheduler'

export type BreakType = 'breathe' | 'rest' | 'stand'
export type BreakSettings = {
  label: string
  enabled: boolean
  interval_min: number
  message: string
  last_fired_ts: number
}
export type Reminder = {
  id: string
  title: string
  category: 'Work' | 'Health' | 'Other'
  time: string
  enabled: boolean
  last_fired_date: string | null
}
type Breaks = Record<BreakType, BreakSettings>

type DataState = {
  loading: boolean
  notes: string
  setNotes: (v: string) => void
  saveNotes: () => Promise<void>
  reminders: Reminder[]
  addReminder: (r: Omit<Reminder, 'id' | 'last_fired_date'>) => Promise<void>
  updateReminder: (id: string, r: Omit<Reminder, 'id' | 'last_fired_date'>) => Promise<void>
  deleteReminder: (id: string) => Promise<void>
  breaks: Breaks | null
  updateBreak: (type: BreakType, patch: Partial<Pick<BreakSettings, 'enabled' | 'interval_min' | 'message'>>) => Promise<void>
  fireBreakNow: (type: BreakType) => void
  nextBreak: { type: BreakType; label: string; progress: number } | null
}

const DataContext = createContext<DataState | null>(null)

function notify(title: string, body: string) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission === 'granted') {
    new Notification(title, { body })
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [breaks, setBreaks] = useState<Breaks | null>(null)
  const [tick, setTick] = useState(0) // forces the "next break" ring to re-render each second

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    Promise.all([api.get('/notes'), api.get('/reminders'), api.get('/breaks')])
      .then(([n, r, b]) => {
        setNotes(n.content ?? '')
        setReminders(r.reminders ?? [])
        setBreaks(b.breaks ?? null)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // live scheduler: check every 15s whether a break or reminder is due
  const breaksRef = useRef(breaks)
  breaksRef.current = breaks
  const remindersRef = useRef(reminders)
  remindersRef.current = reminders

  useEffect(() => {
    const check = () => {
      const now = new Date()
      const nowTs = Date.now() / 1000
      const currentBreaks = breaksRef.current
      if (currentBreaks) {
        ;(Object.keys(currentBreaks) as BreakType[]).forEach((type) => {
          const b = currentBreaks[type]
          if (b.enabled && dueBreak(b.last_fired_ts, b.interval_min, nowTs)) {
            notify(b.label, b.message)
            api.post(`/breaks/${type}/fire`).then((res) => {
              setBreaks((prev) => (prev ? { ...prev, [type]: { ...prev[type], last_fired_ts: res.last_fired_ts } } : prev))
            })
          }
        })
      }
      remindersRef.current.forEach((r) => {
        if (r.enabled && dueReminder(r.time, r.last_fired_date, now)) {
          notify(`${r.category}: ${r.title}`, r.title)
          const today = now.toISOString().slice(0, 10)
          api.post(`/reminders/${r.id}/fire`).then(() => {
            setReminders((prev) => prev.map((x) => (x.id === r.id ? { ...x, last_fired_date: today } : x)))
          })
        }
      })
    }
    const id = setInterval(check, 15000)
    return () => clearInterval(id)
  }, [])

  const saveNotes = useCallback(async () => {
    await api.put('/notes', { content: notes })
  }, [notes])

  const addReminder = useCallback(async (r: Omit<Reminder, 'id' | 'last_fired_date'>) => {
    const { reminder } = await api.post('/reminders', r)
    setReminders((prev) => [...prev, reminder])
  }, [])

  const updateReminder = useCallback(async (id: string, r: Omit<Reminder, 'id' | 'last_fired_date'>) => {
    const { reminder } = await api.put(`/reminders/${id}`, r)
    setReminders((prev) => prev.map((x) => (x.id === id ? reminder : x)))
  }, [])

  const deleteReminder = useCallback(async (id: string) => {
    await api.del(`/reminders/${id}`)
    setReminders((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const updateBreak = useCallback(async (type: BreakType, patch: Partial<Pick<BreakSettings, 'enabled' | 'interval_min' | 'message'>>) => {
    const { break: updated } = await api.put(`/breaks/${type}`, patch)
    setBreaks((prev) => (prev ? { ...prev, [type]: updated } : prev))
  }, [])

  const fireBreakNow = useCallback(
    (type: BreakType) => {
      const b = breaks?.[type]
      if (b) notify(b.label, b.message)
    },
    [breaks],
  )

  let nextBreak: DataState['nextBreak'] = null
  if (breaks) {
    const nowTs = Date.now() / 1000
    let best: { type: BreakType; progress: number } | null = null
    for (const type of Object.keys(breaks) as BreakType[]) {
      const b = breaks[type]
      if (!b.enabled) continue
      const progress = breakProgress(b.last_fired_ts, b.interval_min, nowTs)
      if (!best || progress > best.progress) best = { type, progress }
    }
    if (best) nextBreak = { type: best.type, label: breaks[best.type].label, progress: best.progress }
  }
  void tick // re-evaluate nextBreak on each tick

  return (
    <DataContext.Provider
      value={{
        loading,
        notes,
        setNotes,
        saveNotes,
        reminders,
        addReminder,
        updateReminder,
        deleteReminder,
        breaks,
        updateBreak,
        fireBreakNow,
        nextBreak,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside DataProvider')
  return ctx
}
