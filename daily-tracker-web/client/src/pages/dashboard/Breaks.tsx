import { useState } from 'react'
import { useData, type BreakType } from '../../lib/data'
import { Button, Input } from '../../components/ui'

function BreakCard({ type }: { type: BreakType }) {
  const { breaks, updateBreak, fireBreakNow } = useData()
  const b = breaks![type]
  const [interval_min, setInterval] = useState(b.interval_min)
  const [message, setMessage] = useState(b.message)
  const [saving, setSaving] = useState(false)
  const dirty = interval_min !== b.interval_min || message !== b.message

  const save = async () => {
    setSaving(true)
    try {
      await updateBreak(type, { interval_min, message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-surface overflow-hidden flex">
      <div className="w-1 bg-primary shrink-0" />
      <div className="p-5 flex-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-ink">{b.label}</h3>
          <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
            <input type="checkbox" checked={b.enabled} onChange={(e) => updateBreak(type, { enabled: e.target.checked })} className="accent-primary" />
            Enabled
          </label>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-muted">Every</span>
          <Input
            type="number"
            min={1}
            max={480}
            value={interval_min}
            onChange={(e) => setInterval(Number(e.target.value))}
            className="w-20 font-mono"
          />
          <span className="text-sm text-muted">minutes</span>
        </div>

        <Input value={message} onChange={(e) => setMessage(e.target.value)} className="mb-4" />

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => fireBreakNow(type)} type="button">
            Test now
          </Button>
          {dirty && (
            <Button onClick={save} disabled={saving} type="button">
              {saving ? 'Saving…' : 'Save'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function Breaks() {
  const { breaks, loading } = useData()
  if (loading || !breaks) return null

  return (
    <div>
      <h1 className="font-display text-2xl text-ink mb-1">Breaks</h1>
      <p className="text-sm text-muted mb-6">Notifications need permission from your browser the first time you visit.</p>
      <div className="space-y-4">
        <BreakCard type="breathe" />
        <BreakCard type="rest" />
        <BreakCard type="stand" />
      </div>
    </div>
  )
}
