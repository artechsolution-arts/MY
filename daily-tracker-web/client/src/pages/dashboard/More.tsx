import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/auth'
import { useData, type SettingsPatch } from '../../lib/data'
import { Button, Input } from '../../components/ui'
import { Reminders } from './Reminders'

function toPatch(s: SettingsPatch): SettingsPatch {
  const {
    quiet_hours_enabled,
    quiet_hours_start,
    quiet_hours_end,
    quiet_hours_skip_weekends,
    mobile_quiet_hours_enabled,
    mobile_quiet_hours_start,
    mobile_quiet_hours_end,
    mobile_quiet_hours_skip_weekends,
    motivation_enabled,
    motivation_on_startup,
    motivation_interval_min,
  } = s
  return {
    quiet_hours_enabled,
    quiet_hours_start,
    quiet_hours_end,
    quiet_hours_skip_weekends,
    mobile_quiet_hours_enabled,
    mobile_quiet_hours_start,
    mobile_quiet_hours_end,
    mobile_quiet_hours_skip_weekends,
    motivation_enabled,
    motivation_on_startup,
    motivation_interval_min,
  }
}

function QuietHoursSection({
  title,
  description,
  enabled,
  start,
  end,
  skipWeekends,
  onChange,
}: {
  title: string
  description: string
  enabled: boolean
  start: string
  end: string
  skipWeekends: boolean
  onChange: (patch: { enabled?: boolean; start?: string; end?: string; skipWeekends?: boolean }) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display text-lg text-ink">{title}</h3>
        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
          <input type="checkbox" checked={enabled} onChange={(e) => onChange({ enabled: e.target.checked })} className="accent-primary" />
          Enabled
        </label>
      </div>
      <p className="text-sm text-muted mb-4">{description}</p>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <span className="text-sm text-muted">From</span>
        <Input type="time" value={start} onChange={(e) => onChange({ start: e.target.value })} className="w-32" />
        <span className="text-sm text-muted">to</span>
        <Input type="time" value={end} onChange={(e) => onChange({ end: e.target.value })} className="w-32" />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
        <input type="checkbox" checked={skipWeekends} onChange={(e) => onChange({ skipWeekends: e.target.checked })} className="accent-primary" />
        Also skip weekends entirely
      </label>
    </div>
  )
}

function SettingsPanel() {
  const { settings, updateSettings } = useData()
  const [draft, setDraft] = useState<SettingsPatch | null>(settings && toPatch(settings))
  const [saving, setSaving] = useState(false)

  useEffect(() => setDraft(settings && toPatch(settings)), [settings])

  if (!draft) return null
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings && toPatch(settings))

  const save = async () => {
    setSaving(true)
    try {
      await updateSettings(draft)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 mb-4 space-y-6">
      <QuietHoursSection
        title="Quiet hours — Desktop & Web"
        description="Pause break and motivation nudges during this window on desktop/web. Reminders still fire — those are appointments you set for a specific time."
        enabled={draft.quiet_hours_enabled}
        start={draft.quiet_hours_start}
        end={draft.quiet_hours_end}
        skipWeekends={draft.quiet_hours_skip_weekends}
        onChange={(p) =>
          setDraft({
            ...draft,
            ...(p.enabled !== undefined && { quiet_hours_enabled: p.enabled }),
            ...(p.start !== undefined && { quiet_hours_start: p.start }),
            ...(p.end !== undefined && { quiet_hours_end: p.end }),
            ...(p.skipWeekends !== undefined && { quiet_hours_skip_weekends: p.skipWeekends }),
          })
        }
      />

      <div className="border-t border-line pt-6">
        <QuietHoursSection
          title="Quiet hours — Mobile"
          description="Same idea, scheduled separately for the phone app — so, say, breaks stay silent overnight on mobile while desktop keeps its own hours."
          enabled={draft.mobile_quiet_hours_enabled}
          start={draft.mobile_quiet_hours_start}
          end={draft.mobile_quiet_hours_end}
          skipWeekends={draft.mobile_quiet_hours_skip_weekends}
          onChange={(p) =>
            setDraft({
              ...draft,
              ...(p.enabled !== undefined && { mobile_quiet_hours_enabled: p.enabled }),
              ...(p.start !== undefined && { mobile_quiet_hours_start: p.start }),
              ...(p.end !== undefined && { mobile_quiet_hours_end: p.end }),
              ...(p.skipWeekends !== undefined && { mobile_quiet_hours_skip_weekends: p.skipWeekends }),
            })
          }
        />
      </div>

      <div className="border-t border-line pt-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-display text-lg text-ink">Daily motivation</h3>
          <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={draft.motivation_enabled}
              onChange={(e) => setDraft({ ...draft, motivation_enabled: e.target.checked })}
              className="accent-primary"
            />
            Enabled
          </label>
        </div>
        <p className="text-sm text-muted mb-4">A short line to get moving — once when you start the day, then again on a timer.</p>
        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={draft.motivation_on_startup}
            onChange={(e) => setDraft({ ...draft, motivation_on_startup: e.target.checked })}
            className="accent-primary"
          />
          Send one the first time I open the app each day
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted">Then every</span>
          <Input
            type="number"
            aria-label="Motivation interval in hours"
            min={1}
            max={12}
            value={Math.round(draft.motivation_interval_min / 60)}
            onChange={(e) => setDraft({ ...draft, motivation_interval_min: Math.max(15, Math.min(720, Number(e.target.value) * 60)) })}
            className="w-20 font-mono"
          />
          <span className="text-sm text-muted">hours</span>
        </div>
      </div>

      {dirty && (
        <Button onClick={save} disabled={saving} type="button">
          {saving ? 'Saving…' : 'Save'}
        </Button>
      )}
    </div>
  )
}

export function More() {
  const { logout } = useAuth()

  return (
    <div className="space-y-8">
      <Reminders />

      <div className="border-t border-line pt-6">
        <h2 className="font-display text-xl text-ink mb-4">Quiet hours &amp; motivation</h2>
        <SettingsPanel />
      </div>

      <div className="border-t border-line pt-6">
        <Button variant="secondary" onClick={() => logout()} type="button">
          Log out
        </Button>
      </div>
    </div>
  )
}
