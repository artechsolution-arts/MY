import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { DataProvider, useData } from '../../lib/data'
import { BreathingRing } from '../../components/BreathingRing'
import { NotesIcon, ReminderIcon, BreaksIcon } from '../../components/icons'

const NAV = [
  { to: '/app/notes', label: 'Notes', Icon: NotesIcon },
  { to: '/app/reminders', label: 'Reminders', Icon: ReminderIcon },
  { to: '/app/breaks', label: 'Breaks', Icon: BreaksIcon },
]

export function SidebarNav() {
  return (
    <aside className="hidden sm:flex w-56 border-r border-line px-4 py-6 flex-col gap-1 shrink-0">
      <div className="flex items-center gap-2 px-2 mb-6">
        <BreathingRing size={24} />
        <span className="font-display text-base text-ink">Daily Tracker</span>
      </div>
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
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-10 flex border-t border-line bg-surface">
      {NAV.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
              isActive ? 'text-primary' : 'text-muted'
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

export function Topbar() {
  const { logout } = useAuth()
  const { nextBreak } = useData()
  return (
    <div className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-line">
      <div className="flex items-center gap-3 min-w-0">
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
      <button onClick={() => logout()} className="text-sm text-muted hover:text-ink transition-colors cursor-pointer shrink-0">
        Log out
      </button>
    </div>
  )
}

export function DashboardLayout() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  return (
    <DataProvider>
      <div className="min-h-screen flex">
        <SidebarNav />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 p-5 sm:p-8 pb-24 sm:pb-8 max-w-3xl w-full">
            <Outlet />
          </main>
        </div>
        <BottomNav />
      </div>
    </DataProvider>
  )
}
