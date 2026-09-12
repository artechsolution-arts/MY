import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { DataProvider, useData } from '../lib/data'
import { BreathingRing } from '../components/BreathingRing'
import { api } from '../lib/api'
import { nextReminderOf } from '../lib/scheduler'

function WidgetContent() {
  const { reminders, loading } = useData()
  const next = useMemo(() => nextReminderOf(reminders, new Date()), [reminders])
  const [notes, setNotes] = useState('')

  useEffect(() => {
    api.get('/notes').then((d) => setNotes(d.content ?? ''))
  }, [])

  if (loading) return null

  return (
    <div className="h-screen flex flex-col bg-surface text-ink overflow-hidden">
      <div className="app-drag-region flex items-center gap-2 px-3 py-2.5 border-b border-line shrink-0">
        <BreathingRing size={18} />
        <span className="font-display text-sm">Daily Tracker</span>
      </div>
      <div className="px-3 py-2.5 border-b border-line shrink-0">
        <p className="text-xs text-muted mb-1">Next reminder</p>
        {next ? (
          <p className="text-sm truncate">
            <span className="font-medium font-mono">{next.time}</span> — {next.category}: {next.title}
          </p>
        ) : (
          <p className="text-sm text-muted">No reminders set</p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2.5 app-no-drag">
        <p className="text-xs text-muted mb-1">Notes</p>
        <p className="text-sm whitespace-pre-wrap">{notes || 'No notes yet.'}</p>
      </div>
    </div>
  )
}

/** A tiny always-visible glance view — the desktop app opens this in a separate small always-on-top window. Read-only: open the full app to edit. */
export function Widget() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) {
    return <div className="h-screen flex items-center justify-center text-sm text-muted p-4 text-center app-drag-region">Log in to the main app to see your widget.</div>
  }
  return (
    <DataProvider>
      <WidgetContent />
    </DataProvider>
  )
}
