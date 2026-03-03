import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'

interface ConsoleEntry {
  timestamp: string
  agent: string
  message: string
}

interface SimConsoleProps {
  entries: ConsoleEntry[]
}

const AGENT_COLORS: Record<string, string> = {
  DataAgent: '#22c55e',
  SimAgent: '#f59e0b',
  StrategyAgent: '#ff6b00',
  System: '#8a8580',
}

export function SimConsole({ entries }: SimConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  /* Auto-scroll to bottom when entries change */
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [entries.length])

  return (
    <div
      ref={scrollRef}
      style={{
        background: 'rgba(0, 0, 0, 0.4)',
        borderLeft: '2px solid rgba(255, 107, 0, 0.3)',
        borderRadius: '0 4px 4px 0',
        padding: '12px 16px',
        maxHeight: '200px',
        overflowY: 'auto',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        lineHeight: 1.8,
      }}
    >
      {entries.map((entry, i) => (
        <motion.div
          key={`${entry.timestamp}-${i}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.3,
            delay: i * 0.06,
          }}
          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        >
          <span style={{ color: 'var(--text-ghost)' }}>
            [{entry.timestamp}]
          </span>{' '}
          <span
            style={{
              color: AGENT_COLORS[entry.agent] ?? 'var(--text-secondary)',
              fontWeight: 600,
            }}
          >
            {entry.agent}:
          </span>{' '}
          <span style={{ color: 'var(--text-secondary)' }}>
            {entry.message}
          </span>
        </motion.div>
      ))}

      {/* Blinking cursor */}
      <motion.span
        style={{
          display: 'inline-block',
          width: '6px',
          height: '12px',
          background: 'var(--accent-orange)',
          marginLeft: '2px',
          verticalAlign: 'middle',
        }}
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}
