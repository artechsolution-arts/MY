import { useState } from 'react'
import { useData, type Break } from '../../lib/data'
import { Button, Input, Label } from '../../components/ui'

type Draft = Omit<Break, 'id' | 'last_fired_ts'>
const EMPTY: Draft = { label: '', enabled: true, interval_min: 20, message: '' }

function BreakForm({ initial, onSave, onCancel }: { initial: Draft; onSave: (d: Draft) => Promise<void>; onCancel: () => void }) {
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
    <div className="rounded-2xl border border-line bg-surface p-5 space-y-3">
      <div>
        <Label htmlFor="b-label">Name</Label>
        <Input id="b-label" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Eye rest" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted">Every</span>
        <Input
          id="b-interval"
          aria-label="Interval in minutes"
          type="number"
          min={1}
          max={480}
          value={draft.interval_min}
          onChange={(e) => setDraft({ ...draft, interval_min: Number(e.target.value) })}
          className="w-20 font-mono"
        />
        <span className="text-sm text-muted">minutes</span>
      </div>
      <div>
        <Label htmlFor="b-message">Message</Label>
        <Input id="b-message" value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} placeholder="Look at something 20 feet away for 20 seconds." />
      </div>
      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
          <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} className="accent-primary" />
          Enabled
        </label>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel} type="button">
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !draft.label.trim() || !draft.message.trim()} type="button">
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}

function BreakCard({ b, onEdit }: { b: Break; onEdit: () => void }) {
  const { updateBreak, deleteBreak, fireBreakNow } = useData()
  const [testResult, setTestResult] = useState<'shown' | 'denied' | 'unsupported' | null>(null)

  const toggleEnabled = () => updateBreak(b.id, { label: b.label, enabled: !b.enabled, interval_min: b.interval_min, message: b.message })

  const test = async () => {
    setTestResult(await fireBreakNow(b.id))
  }

  return (
    <div className="rounded-2xl border border-line bg-surface overflow-hidden flex">
      <div className="w-1 bg-primary shrink-0" />
      <div className="p-5 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-3">
          <h3 className="font-display text-lg text-ink truncate">{b.label}</h3>
          <div className="flex items-center gap-4 shrink-0">
            <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
              <input type="checkbox" checked={b.enabled} onChange={toggleEnabled} className="accent-primary" />
              Enabled
            </label>
            <button onClick={onEdit} className="text-xs text-muted hover:text-ink cursor-pointer transition-colors">
              Edit
            </button>
            <button onClick={() => deleteBreak(b.id)} className="text-xs text-muted hover:text-red-600 cursor-pointer transition-colors">
              Delete
            </button>
          </div>
        </div>

        <p className="text-xs text-muted font-mono mb-2">Every {b.interval_min} minutes</p>
        <p className="text-sm text-ink mb-4">{b.message}</p>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={test} type="button">
            Test now
          </Button>
          {testResult === 'shown' && <span className="text-xs text-accent">Notification sent — check your system tray.</span>}
          {testResult === 'denied' && (
            <span className="text-xs text-red-600">
              Notifications are blocked. Enable them for this site in your browser's settings, then try again.
            </span>
          )}
          {testResult === 'unsupported' && <span className="text-xs text-muted">This browser doesn't support notifications.</span>}
        </div>
      </div>
    </div>
  )
}

export function Breaks() {
  const { breaks, loading, addBreak, updateBreak } = useData()
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)

  if (loading) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl text-ink">Breaks</h1>
        {editingId === null && <Button onClick={() => setEditingId('new')}>Add break</Button>}
      </div>
      <p className="text-sm text-muted mb-6">The first time you click "Test now," your browser will ask permission to show notifications.</p>

      <div className="space-y-4">
        {editingId === 'new' && (
          <BreakForm
            initial={EMPTY}
            onCancel={() => setEditingId(null)}
            onSave={async (d) => {
              await addBreak(d)
              setEditingId(null)
            }}
          />
        )}

        {breaks.length === 0 && editingId !== 'new' && (
          <p className="text-sm text-muted py-8 text-center">No breaks yet — add one for whatever your body needs reminding to do.</p>
        )}

        {breaks.map((b) =>
          editingId === b.id ? (
            <BreakForm
              key={b.id}
              initial={b}
              onCancel={() => setEditingId(null)}
              onSave={async (d) => {
                await updateBreak(b.id, d)
                setEditingId(null)
              }}
            />
          ) : (
            <BreakCard key={b.id} b={b} onEdit={() => setEditingId(b.id)} />
          ),
        )}
      </div>
    </div>
  )
}
