import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { BreathingRing } from './BreathingRing'

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center px-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2.5 justify-center mb-8">
          <BreathingRing size={26} />
          <span className="font-display text-lg font-medium text-ink">Daily Tracker</span>
        </Link>
        <h1 className="font-display text-2xl text-ink text-center">{title}</h1>
        <p className="text-muted text-sm text-center mt-1.5 mb-7">{subtitle}</p>
        {children}
      </div>
    </div>
  )
}
