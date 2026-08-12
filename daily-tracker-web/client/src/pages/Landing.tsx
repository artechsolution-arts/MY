import { Link } from 'react-router-dom'
import { BreathingRing } from '../components/BreathingRing'
import { Button } from '../components/ui'

const FEATURES = [
  {
    title: 'Jot the thing down before it slips your mind.',
    body: 'One page, always open, saved as you type. No folders to file it in, no app switch to lose your place.',
  },
  {
    title: "A nudge for the meeting you'll forget.",
    body: 'Set a time, mark it Work or Health, and it shows up right when it matters — not buried in a calendar you forgot to open.',
  },
  {
    title: "A reason to stand up that isn't guilt.",
    body: 'Breathing, resting, standing — each on its own timer, each with its own message, entirely yours to set.',
  },
]

export function Landing() {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5">
          <BreathingRing size={28} />
          <span className="font-display text-lg font-medium text-ink">Daily Tracker</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-muted hover:text-ink transition-colors px-2">
            Log in
          </Link>
          <Link to="/signup">
            <Button>Start tracking</Button>
          </Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-6">
        <section className="flex flex-col items-center text-center pt-16 pb-24">
          <BreathingRing size={280} />
          <h1 className="font-display text-4xl sm:text-5xl font-medium text-ink mt-10 max-w-2xl text-balance">
            Work doesn't have to happen in one long held breath.
          </h1>
          <p className="text-muted text-lg mt-5 max-w-xl text-balance">
            Daily Tracker keeps your notes, your reminders, and your body's need to move — all on one quiet page.
          </p>
          <div className="flex items-center gap-4 mt-9">
            <Link to="/signup">
              <Button className="px-7 py-3 text-base">Start tracking — it's free</Button>
            </Link>
          </div>
        </section>

        <section className="grid sm:grid-cols-3 gap-6 pb-28">
          {FEATURES.map((f) => (
            <div key={f.title} className="border-t-2 border-primary pt-5">
              <h3 className="font-display text-xl text-ink text-balance">{f.title}</h3>
              <p className="text-muted text-sm mt-2.5 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-line py-8 text-center text-sm text-muted">
        Daily Tracker — built for one person's workday, not a whole team's.
      </footer>
    </div>
  )
}
