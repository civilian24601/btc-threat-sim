import { motion } from 'framer-motion'
import { GlassPanel } from './ui'

interface Strategy {
  name: string
  description: string
  priority: number
  references: string[]
}

interface StrategyCardsProps {
  strategies: Strategy[]
}

const PRIORITY_COLORS: Record<number, string> = {
  1: '#dc2626', // extreme
  2: '#ff4400', // high
  3: '#f59e0b', // mid
  4: '#22c55e', // low
  5: '#8a8580', // neutral
}

export function StrategyCards({ strategies }: StrategyCardsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {strategies.map((s, i) => (
        <motion.div
          key={s.name}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            delay: i * 0.1,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <GlassPanel index={0} className="!p-0">
            <div
              style={{
                display: 'flex',
                gap: '14px',
                padding: '14px 16px',
                alignItems: 'flex-start',
              }}
            >
              {/* Priority number */}
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '22px',
                  fontWeight: 700,
                  lineHeight: 1,
                  color: PRIORITY_COLORS[s.priority] ?? '#8a8580',
                  minWidth: '28px',
                  textAlign: 'center',
                  paddingTop: '2px',
                }}
              >
                {s.priority}
              </span>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    lineHeight: 1.3,
                    marginBottom: '4px',
                  }}
                >
                  {s.name}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  {s.description}
                </div>

                {/* Reference tags */}
                {s.references.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '6px',
                      marginTop: '8px',
                    }}
                  >
                    {s.references.map((ref) => (
                      <span
                        key={ref}
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          fontWeight: 500,
                          color: 'var(--text-ghost)',
                          border: '1px solid rgba(74, 69, 64, 0.3)',
                          borderRadius: '3px',
                          padding: '2px 6px',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {ref}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </GlassPanel>
        </motion.div>
      ))}
    </div>
  )
}
