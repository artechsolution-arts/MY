import { useEffect, useRef, useState } from 'react'
import { useData } from '../../lib/data'

export function Notes() {
  const { notes, setNotes, saveNotes } = useData()
  const [status, setStatus] = useState('')
  const timeout = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => window.clearTimeout(timeout.current)
  }, [])

  const onChange = (value: string) => {
    setNotes(value)
    window.clearTimeout(timeout.current)
    timeout.current = window.setTimeout(async () => {
      await saveNotes()
      setStatus(`Saved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
    }, 800)
  }

  return (
    <div className="flex flex-col h-full">
      <h1 className="font-display text-2xl text-ink mb-4">Notes</h1>
      <textarea
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Jot the thing down before it slips your mind…"
        className="flex-1 min-h-[60vh] w-full rounded-2xl border border-line bg-surface p-5 text-sm leading-relaxed text-ink placeholder:text-muted/60 focus:border-primary outline-none resize-none font-mono"
      />
      <p className="text-xs text-muted mt-2 text-right h-4">{status}</p>
    </div>
  )
}
