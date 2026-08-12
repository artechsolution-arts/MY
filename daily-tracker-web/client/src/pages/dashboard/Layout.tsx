import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { DataProvider, useData } from '../../lib/data'
import { BreathingRing } from '../../components/BreathingRing'

const NAV = [
  { to: '/app/notes', label: 'Notes' },
  { to: '/app/reminders', label: 'Reminders' },
  { to: '/app/breaks', label: 'Breaks' },
]

function Topbar() {
  const { logout } = useAuth()
  const { nextBreak } = useData()
  return (
    <div className="flex items-center justify-between px-8 py-4 border-b border-line">
      <div className="flex items-center gap-3">
        {nextBreak ? (
          <>
            <BreathingRing size={32} progress={nextBreak.progress} />
            <span className="text-sm text-muted">
              Next: <span className="text-ink font-medium">{nextBreak.label}</span>
            </span>
          </>
        ) : (
          <span className="text-sm text-muted">No breaks scheduled</span>
        )}
      </div>
      <button onClick={() => logout()} className="text-sm text-muted hover:text-ink transition-colors cursor-pointer">
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
        <aside className="w-56 border-r border-line px-4 py-6 flex flex-col gap-1 shrink-0">
          <div className="flex items-center gap-2 px-2 mb-6">
            <BreathingRing size={24} />
            <span className="font-display text-base text-ink">Daily Tracker</span>
          </div>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary-tint text-primary-deep' : 'text-muted hover:bg-bg hover:text-ink'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </aside>
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 p-8 max-w-3xl w-full">
            <Outlet />
          </main>
        </div>
      </div>
    </DataProvider>
  )
}
