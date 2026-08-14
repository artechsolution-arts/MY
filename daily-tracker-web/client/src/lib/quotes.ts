// Short, plain, no-hype lines — picked to sound like the rest of the app's
// copy, not like a poster. One pool used for both the once-a-day startup
// greeting and the periodic nudges; the notification title supplies context.
export const MOTIVATION_QUOTES = [
  "One task at a time gets you further than ten at once.",
  "You don't need to feel ready to start.",
  'Small progress is still progress.',
  "The hard part is starting — you've already done that.",
  'Done is better than perfect, most days.',
  "Whatever's next, you've handled harder.",
  "Progress doesn't have to be loud to count.",
  'Today only needs to move forward, not be perfect.',
  "You've got more control over today than it feels like.",
  'Rest counts as progress too.',
  'The next five minutes are enough to start with.',
  "You don't have to finish it, just begin it.",
  'Every big thing you finished started as a small thing.',
  'Slow and steady still gets there.',
  'One good decision now beats ten later.',
  "You're allowed to take this one step at a time.",
  "Today's a fresh page, not a test you can fail.",
  'Momentum starts with the first small task.',
  'Nobody sees the effort, just the result — put it in anyway.',
  "It doesn't have to be today's biggest win, just a real one.",
] as const

export function randomQuote(excluding?: string): string {
  const pool = excluding ? MOTIVATION_QUOTES.filter((q) => q !== excluding) : MOTIVATION_QUOTES
  return pool[Math.floor(Math.random() * pool.length)]
}
