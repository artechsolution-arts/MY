import type { ReactNode } from 'react'

type BreathingRingProps = {
  size?: number
  /** 0..1 time-until-next-break; omit for the pure ambient hero version */
  progress?: number
  children?: ReactNode
}

// The signature visual: an ambient pulse on a real breathing cadence, with an
// optional accent arc showing progress toward the next scheduled break.
export function BreathingRing({ size = 220, progress, children }: BreathingRingProps) {
  const stroke = size * 0.035
  const radius = size / 2 - stroke
  const circumference = 2 * Math.PI * radius
  const offset = progress != null ? circumference * (1 - progress) : circumference

  return (
    <div className="relative grid place-items-center shrink-0" style={{ width: size, height: size }}>
      <div
        className="absolute rounded-full"
        style={{
          inset: '14%',
          background:
            'radial-gradient(circle at 35% 30%, var(--color-primary-tint), var(--color-primary) 75%)',
          animation: 'breathe 8s ease-in-out infinite',
        }}
      />
      {progress != null && (
        <svg width={size} height={size} className="absolute inset-0 -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
      )}
      <div className="relative z-10 text-center">{children}</div>
    </div>
  )
}
