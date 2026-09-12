import { useState } from 'react'
import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { DataProvider, useData } from '../../lib/data'
import { BreathingRing } from '../../components/BreathingRing'
import { NotesIcon, BreaksIcon, MoreIcon } from '../../components/icons'

const NAV = [
  { to: '/app/notes', label: 'Notes', Icon: NotesIcon },
  { to: '/app/breaks', label: 'Breaks', Icon: BreaksIcon },
  { to: '/app/more', label: 'More', Icon: MoreIcon },
]

export function SidebarNav({ onLogoClick }: { onLogoClick: () => void }) {
  return (
    <aside className="hidden sm:flex w-56 border-r border-line px-4 py-6 flex-col gap-1 shrink-0">
      <button onClick={onLogoClick} className="flex items-center gap-2 px-2 mb-6 cursor-pointer" type="button">
        <BreathingRing size={24} />
        <span className="font-display text-base text-ink">Daily Tracker</span>
      </button>
      {NAV.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-primary-tint text-primary-deep' : 'text-muted hover:bg-bg hover:text-ink'
            }`
          }
        >
          <Icon className="w-5 h-5 shrink-0" />
          {label}
        </NavLink>
      ))}
    </aside>
  )
}

export function BottomNav() {
  return (
    <nav className="sm:hidden fixed bottom-4 inset-x-4 z-10 flex justify-between rounded-full border border-line bg-surface shadow-lg px-2 py-1.5">
      {NAV.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
              isActive ? 'bg-primary-tint text-primary-deep' : 'text-muted'
            }`
          }
        >
          <Icon className="w-5 h-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export function Topbar({ onLogoClick }: { onLogoClick: () => void }) {
  const { nextBreak } = useData()
  return (
    <div className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-line">
      <button onClick={onLogoClick} className="flex items-center gap-2 min-w-0 sm:hidden cursor-pointer" type="button">
        <BreathingRing size={24} />
        <span className="font-display text-base text-ink">Daily Tracker</span>
      </button>
      <div className="hidden sm:flex items-center gap-3 min-w-0">
        {nextBreak ? (
          <>
            <BreathingRing size={32} progress={nextBreak.progress} />
            <span className="text-sm text-muted truncate">
              Next: <span className="text-ink font-medium">{nextBreak.label}</span>
            </span>
          </>
        ) : (
          <span className="text-sm text-muted">No breaks scheduled</span>
        )}
      </div>
    </div>
  )
}

function MeditationOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col items-center justify-center gap-6 px-6">
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-5 right-5 text-muted hover:text-ink cursor-pointer text-2xl leading-none"
        type="button"
      >
        ×
      </button>
      <BreathingRing size={220} />
      <div className="text-center">
        <p className="font-display text-2xl text-ink mb-1">Take a deep breath.</p>
        <p className="text-sm text-muted">In for four. Hold for four. Out for four.</p>
      </div>
      <iframe
        width="280"
        height="158"
        src="https://www.youtube.com/embed/vPvIxwh9N2w?autoplay=1&loop=1&playlist=vPvIxwh9N2w"
        title="Meditation music"
        allow="autoplay; encrypted-media"
        className="rounded-xl border border-line"
      />
    </div>
  )
}

export function DashboardLayout() {
  const { user, loading } = useAuth()
  const [meditating, setMeditating] = useState(false)
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  return (
    <DataProvider>
      <div className="min-h-screen flex">
        <SidebarNav onLogoClick={() => setMeditating(true)} />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar onLogoClick={() => setMeditating(true)} />
          <main className="flex-1 p-5 sm:p-8 pb-24 sm:pb-8 max-w-3xl w-full">
            <Outlet />
          </main>
        </div>
        <BottomNav />
      </div>
      {meditating && <MeditationOverlay onClose={() => setMeditating(false)} />}
    </DataProvider>
  )
}
