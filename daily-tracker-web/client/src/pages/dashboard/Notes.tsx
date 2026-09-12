import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api'
import { Input } from '../../components/ui'
import { dateStr } from '../../lib/scheduler'
import { useData } from '../../lib/data'
import { updateWidget } from '../../lib/nativeNotify'

export function Notes() {
  const { reminders } = useData()
  const today = dateStr(new Date())
  const [date, setDate] = useState(today)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const timeout = useRef<number | undefined>(undefined)
  const loadId = useRef(0)

  useEffect(() => {
    const id = ++loadId.current
    setLoading(true)
    setStatus('')
    api.get(`/notes?date=${date}`).then((d) => {
      if (loadId.current === id) {
        setContent(d.content ?? '')
        setLoading(false)
      }
    })
  }, [date])

  useEffect(() => () => window.clearTimeout(timeout.current), [])

  const onChange = (value: string) => {
    setContent(value)
    window.clearTimeout(timeout.current)
    timeout.current = window.setTimeout(async () => {
      await api.put('/notes', { date, content: value })
      setStatus(`Saved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
      if (date === today) updateWidget(reminders, value)
    }, 800)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h1 className="font-display text-2xl text-ink">Journal</h1>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" aria-label="Journal date" />
      </div>
      <textarea
        value={content}
        disabled={loading}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Jot the thing down before it slips your mind…"
        className="flex-1 min-h-[60vh] w-full rounded-2xl border border-line bg-surface p-5 text-sm leading-relaxed text-ink placeholder:text-muted/60 focus:border-primary outline-none resize-none font-mono disabled:opacity-60"
      />
      <p className="text-xs text-muted mt-2 text-right h-4">{status}</p>
    </div>
  )
}
