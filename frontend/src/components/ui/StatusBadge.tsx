import { motion } from 'framer-motion'

type BadgeVariant = 'low' | 'mid' | 'high' | 'extreme' | 'neutral'

interface StatusBadgeProps {
  variant: BadgeVariant
  label: string
  className?: string
}

const variantConfig: Record<
  BadgeVariant,
  { color: string; bg: string; pulse: boolean }
> = {
  low: {
    color: 'var(--risk-low)',
    bg: 'rgba(34, 197, 94, 0.1)',
    pulse: false,
  },
  mid: {
    color: 'var(--risk-mid)',
    bg: 'rgba(245, 158, 11, 0.1)',
    pulse: false,
  },
  high: {
    color: 'var(--risk-high)',
    bg: 'rgba(255, 68, 0, 0.1)',
    pulse: true,
  },
  extreme: {
    color: 'var(--risk-extreme)',
    bg: 'rgba(220, 38, 38, 0.12)',
    pulse: true,
  },
  neutral: {
    color: 'var(--text-secondary)',
    bg: 'rgba(138, 133, 128, 0.08)',
    pulse: false,
  },
}

export function StatusBadge({
  variant,
  label,
  className = '',
}: StatusBadgeProps) {
  const config = variantConfig[variant]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 ${className}`}
      style={{
        background: config.bg,
        border: `1px solid ${config.color}20`,
      }}
    >
      {/* Dot indicator */}
      <span className="relative flex h-1.5 w-1.5">
        {config.pulse && (
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ background: config.color }}
            animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.8, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <span
          className="relative inline-flex h-1.5 w-1.5 rounded-full"
          style={{ background: config.color }}
        />
      </span>

      {/* Label */}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: config.color,
          lineHeight: 1,
        }}
      >
        {label}
      </span>
    </span>
  )
}
