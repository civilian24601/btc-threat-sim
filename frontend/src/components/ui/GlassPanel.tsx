import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface GlassPanelProps {
  children: ReactNode
  glow?: boolean
  noPadding?: boolean
  className?: string
  index?: number
}

export function GlassPanel({
  children,
  glow = false,
  noPadding = false,
  className = '',
  index = 0,
}: GlassPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.08,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={`relative overflow-hidden ${className}`}
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(var(--glass-blur))',
        WebkitBackdropFilter: 'blur(var(--glass-blur))',
        border: 'var(--glass-border)',
        borderRadius: 'var(--panel-radius)',
        padding: noPadding ? undefined : 'var(--panel-padding)',
        boxShadow: glow ? 'var(--glow-orange)' : 'none',
        transition: 'box-shadow 300ms var(--ease-out-expo)',
      }}
      whileHover={{
        boxShadow:
          '0 0 20px rgba(255, 107, 0, 0.15), 0 0 60px rgba(255, 107, 0, 0.05)',
      }}
    >
      {children}
    </motion.div>
  )
}
