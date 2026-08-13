type IconProps = { className?: string }

export function NotesIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 3.5h9l3 3v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z" />
      <path d="M9 12h6M9 15.5h6M9 8.5h2" />
    </svg>
  )
}

export function ReminderIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3.5a4.5 4.5 0 0 0-4.5 4.5v2.6c0 .8-.3 1.6-.9 2.2L5 14.5h14l-1.6-1.7a3.2 3.2 0 0 1-.9-2.2V8a4.5 4.5 0 0 0-4.5-4.5z" />
      <path d="M10 17.5a2 2 0 0 0 4 0" />
    </svg>
  )
}

export function BreaksIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="2.75" fill="currentColor" stroke="none" />
    </svg>
  )
}
