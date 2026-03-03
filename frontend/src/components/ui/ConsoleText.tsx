import { motion } from 'framer-motion'
import { useMemo } from 'react'

interface ConsoleTextProps {
  text: string
  typewriter?: boolean
  className?: string
}

export function ConsoleText({
  text,
  typewriter = false,
  className = '',
}: ConsoleTextProps) {
  const characters = useMemo(() => text.split(''), [text])

  if (typewriter) {
    return (
      <div
        className={`relative overflow-hidden ${className}`}
        style={{
          background: 'rgba(0, 0, 0, 0.4)',
          borderLeft: '2px solid rgba(255, 107, 0, 0.3)',
          padding: '12px 16px',
          borderRadius: '0 4px 4px 0',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {characters.map((char, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.02,
                delay: i * 0.018,
              }}
            >
              {char}
            </motion.span>
          ))}
        </span>
      </div>
    )
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: 'rgba(0, 0, 0, 0.4)',
        borderLeft: '2px solid rgba(255, 107, 0, 0.3)',
        padding: '12px 16px',
        borderRadius: '0 4px 4px 0',
      }}
    >
      <pre
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          lineHeight: 1.7,
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {text}
      </pre>
    </div>
  )
}
