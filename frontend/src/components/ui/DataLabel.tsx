interface DataLabelProps {
  label: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down'
  className?: string
}

export function DataLabel({
  label,
  value,
  unit,
  trend,
  className = '',
}: DataLabelProps) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      {/* Label */}
      <span
        style={{
          color: 'var(--text-secondary)',
          fontSize: '10px',
          fontFamily: 'var(--font-mono)',
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          lineHeight: 1,
        }}
      >
        {label}
      </span>

      {/* Value row */}
      <span className="flex items-baseline gap-1">
        <span
          style={{
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '18px',
            fontWeight: 600,
            lineHeight: 1.2,
          }}
        >
          {value}
        </span>

        {unit && (
          <span
            style={{
              color: 'var(--text-ghost)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 400,
            }}
          >
            {unit}
          </span>
        )}

        {trend && (
          <span
            style={{
              fontSize: '14px',
              lineHeight: 1,
              color: trend === 'up' ? 'var(--risk-low)' : 'var(--risk-high)',
            }}
          >
            {trend === 'up' ? '\u25B2' : '\u25BC'}
          </span>
        )}
      </span>
    </div>
  )
}
