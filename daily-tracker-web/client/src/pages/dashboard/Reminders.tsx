import { useState } from 'react'
import { useData, type Reminder } from '../../lib/data'
import { Button, Input, Label } from '../../components/ui'

type Draft = Omit<Reminder, 'id' | 'last_fired_date'>
const EMPTY: Draft = { title: '', category: 'Work', time: '09:00', enabled: true }

function ReminderForm({ initial, onSave, onCancel }: { initial: Draft; onSave: (d: Draft) => Promise<void>; onCancel: () => void }) {
  const [draft, setDraft] = useState(initial)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    try {
      await onSave(draft)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 grid sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
      <div>
        <Label htmlFor="r-title">Title</Label>
        <Input id="r-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Standup meeting" />
      </div>
      <div>
        <Label htmlFor="r-cat">Category</Label>
        <select
          id="r-cat"
          value={draft.category}
          onChange={(e) => setDraft({ ...draft, category: e.target.value as Draft['category'] })}
          className="rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
        >
          <option>Work</option>
          <option>Health</option>
          <option>Other</option>
        </select>
      </div>
      <div>
        <Label htmlFor="r-time">Time</Label>
        <Input id="r-time" type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} />
      </div>
      <div className="sm:col-span-3 flex items-center justify-between mt-1">
        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
          <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} className="accent-primary" />
          Enabled
        </label>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel} type="button">
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !draft.title.trim()} type="button">
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}

export function Reminders() {
  const { reminders, addReminder, updateReminder, deleteReminder } = useData()
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl text-ink">Reminders</h1>
        {editingId === null && <Button onClick={() => setEditingId('new')}>Add reminder</Button>}
      </div>

      <div className="space-y-3">
        {editingId === 'new' && (
          <ReminderForm
            initial={EMPTY}
            onCancel={() => setEditingId(null)}
            onSave={async (d) => {
              await addReminder(d)
              setEditingId(null)
            }}
          />
        )}

        {reminders.length === 0 && editingId !== 'new' && (
          <p className="text-sm text-muted py-8 text-center">No reminders yet — add one for something you tend to forget.</p>
        )}

        {reminders.map((r) =>
          editingId === r.id ? (
            <ReminderForm
              key={r.id}
              initial={r}
              onCancel={() => setEditingId(null)}
              onSave={async (d) => {
                await updateReminder(r.id, d)
                setEditingId(null)
              }}
            />
          ) : (
            <div key={r.id} className="rounded-2xl border border-line bg-surface p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className={`h-2 w-2 rounded-full shrink-0 ${r.enabled ? 'bg-accent' : 'bg-line'}`} />
                <div>
                  <p className="text-sm font-medium text-ink">{r.title}</p>
                  <p className="text-xs text-muted mt-0.5 font-mono">
                    {r.category} · {r.time}
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setEditingId(r.id)}
                  className="text-xs text-muted hover:text-ink px-3 py-1.5 rounded-full hover:bg-bg cursor-pointer transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteReminder(r.id)}
                  className="text-xs text-muted hover:text-red-600 px-3 py-1.5 rounded-full hover:bg-bg cursor-pointer transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
