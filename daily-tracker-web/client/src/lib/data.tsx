import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { api } from './api'
import { dueBreak, dueReminder, breakProgress } from './scheduler'

export type Break = {
  id: string
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

type DataState = {
  loading: boolean
  notes: string
  setNotes: (v: string) => void
  saveNotes: () => Promise<void>
  reminders: Reminder[]
  addReminder: (r: Omit<Reminder, 'id' | 'last_fired_date'>) => Promise<void>
  updateReminder: (id: string, r: Omit<Reminder, 'id' | 'last_fired_date'>) => Promise<void>
  deleteReminder: (id: string) => Promise<void>
  breaks: Break[]
  addBreak: (b: Omit<Break, 'id' | 'last_fired_ts'>) => Promise<void>
  updateBreak: (id: string, patch: Omit<Break, 'id' | 'last_fired_ts'>) => Promise<void>
  deleteBreak: (id: string) => Promise<void>
  fireBreakNow: (id: string) => Promise<'shown' | 'denied' | 'unsupported'>
  nextBreak: { id: string; label: string; progress: number } | null
}

const DataContext = createContext<DataState | null>(null)

// Only call from a real click handler — browsers require a user gesture to
// prompt for permission; requesting on page load gets silently suppressed.
async function notify(title: string, body: string): Promise<'shown' | 'denied' | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported'
  let permission = Notification.permission
  if (permission === 'default') permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'
  new Notification(title, { body })
  return 'shown'
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [breaks, setBreaks] = useState<Break[]>([])
  const [tick, setTick] = useState(0) // forces the "next break" ring to re-render each second

  useEffect(() => {
    Promise.all([api.get('/notes'), api.get('/reminders'), api.get('/breaks')])
      .then(([n, r, b]) => {
        setNotes(n.content ?? '')
        setReminders(r.reminders ?? [])
        setBreaks(b.breaks ?? [])
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
      breaksRef.current.forEach((b) => {
        if (b.enabled && dueBreak(b.last_fired_ts, b.interval_min, nowTs)) {
          notify(b.label, b.message)
          api.post(`/breaks/${b.id}/fire`).then((res) => {
            setBreaks((prev) => prev.map((x) => (x.id === b.id ? { ...x, last_fired_ts: res.last_fired_ts } : x)))
          })
        }
      })
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

  const addBreak = useCallback(async (b: Omit<Break, 'id' | 'last_fired_ts'>) => {
    const { break: created } = await api.post('/breaks', b)
    setBreaks((prev) => [...prev, created])
  }, [])

  const updateBreak = useCallback(async (id: string, patch: Omit<Break, 'id' | 'last_fired_ts'>) => {
    const { break: updated } = await api.put(`/breaks/${id}`, patch)
    setBreaks((prev) => prev.map((x) => (x.id === id ? updated : x)))
  }, [])

  const deleteBreak = useCallback(async (id: string) => {
    await api.del(`/breaks/${id}`)
    setBreaks((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const fireBreakNow = useCallback(
    async (id: string) => {
      const b = breaks.find((x) => x.id === id)
      if (!b) return 'denied' as const
      return notify(b.label, b.message)
    },
    [breaks],
  )

  let nextBreak: DataState['nextBreak'] = null
  const nowTs = Date.now() / 1000
  for (const b of breaks) {
    if (!b.enabled) continue
    const progress = breakProgress(b.last_fired_ts, b.interval_min, nowTs)
    if (!nextBreak || progress > nextBreak.progress) nextBreak = { id: b.id, label: b.label, progress }
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
        addBreak,
        updateBreak,
        deleteBreak,
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
