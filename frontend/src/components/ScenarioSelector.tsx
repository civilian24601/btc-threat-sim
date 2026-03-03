import { motion } from 'framer-motion'
import { useCallback, useState } from 'react'

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

export type ScenarioId = '51_attack' | 'quantum_break' | 'game_theory'

interface ScenarioParams {
  scenario: ScenarioId
  iterations: number
  attackerHashpower: number
  quantumCapability: number
  interplanetary: boolean
}

interface ScenarioSelectorProps {
  value: ScenarioParams
  onChange: (params: ScenarioParams) => void
  onRun: () => void
  isRunning: boolean
}

/* ═══════════════════════════════════════════════════════════════════
   Scenario metadata
   ═══════════════════════════════════════════════════════════════════ */

const SCENARIOS: { id: ScenarioId; label: string }[] = [
  { id: '51_attack', label: '51% Attack' },
  { id: 'quantum_break', label: 'Quantum Threat' },
  { id: 'game_theory', label: 'Game Theory' },
]

/* ═══════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════ */

export function ScenarioSelector({
  value,
  onChange,
  onRun,
  isRunning,
}: ScenarioSelectorProps) {
  const [flashActive, setFlashActive] = useState(false)

  const set = useCallback(
    (partial: Partial<ScenarioParams>) => {
      onChange({ ...value, ...partial })
    },
    [value, onChange],
  )

  const handleRun = () => {
    setFlashActive(true)
    setTimeout(() => setFlashActive(false), 200)
    onRun()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* ── Scenario buttons ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {SCENARIOS.map((s) => {
          const active = value.scenario === s.id
          return (
            <button
              key={s.id}
              onClick={() => set({ scenario: s.id })}
              style={{
                flex: 1,
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '8px 12px',
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'all 200ms var(--ease-out-expo)',
                background: active
                  ? 'var(--glass-bg)'
                  : 'var(--bg-surface)',
                border: active
                  ? '1px solid var(--border-hot)'
                  : '1px solid var(--border-subtle)',
                color: active
                  ? 'var(--accent-orange)'
                  : 'var(--text-secondary)',
                boxShadow: active
                  ? '0 0 12px rgba(255, 107, 0, 0.12)'
                  : 'none',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.borderColor = 'var(--border-glow)'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)'
                }
              }}
            >
              {s.label}
            </button>
          )
        })}
      </div>

      {/* ── Parameters ────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'flex-end',
        }}
      >
        {/* 51% Attack: attacker hashpower slider */}
        {value.scenario === '51_attack' && (
          <div style={{ flex: '1 1 200px' }}>
            <SliderField
              label="Attacker Hashpower"
              value={value.attackerHashpower}
              onChange={(v) => set({ attackerHashpower: v })}
              min={0}
              max={100}
              unit="%"
            />
          </div>
        )}

        {/* Quantum: capability slider + interplanetary toggle */}
        {value.scenario === 'quantum_break' && (
          <>
            <div style={{ flex: '1 1 200px' }}>
              <SliderField
                label="Quantum Capability"
                value={value.quantumCapability}
                onChange={(v) => set({ quantumCapability: v })}
                min={0}
                max={100}
                unit="%"
              />
            </div>
            <div style={{ flex: '0 0 auto' }}>
              <ToggleField
                label="Interplanetary"
                value={value.interplanetary}
                onChange={(v) => set({ interplanetary: v })}
              />
            </div>
          </>
        )}

        {/* Iterations (shared) */}
        <div style={{ flex: '0 0 130px' }}>
          <label
            style={{
              display: 'block',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}
          >
            Iterations
          </label>
          <input
            type="number"
            min={1}
            max={100000}
            value={value.iterations}
            onChange={(e) =>
              set({ iterations: Math.max(1, parseInt(e.target.value) || 1) })
            }
            style={{
              width: '100%',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              padding: '6px 10px',
              outline: 'none',
              transition: 'border-color 200ms',
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = 'var(--border-glow)')
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = 'var(--border-subtle)')
            }
          />
        </div>
      </div>

      {/* ── RUN button ────────────────────────────────────────────── */}
      <motion.button
        onClick={handleRun}
        disabled={isRunning}
        style={{
          width: '100%',
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          padding: '12px 24px',
          cursor: isRunning ? 'not-allowed' : 'pointer',
          borderRadius: '4px',
          border: 'none',
          color: isRunning ? 'var(--text-secondary)' : '#06060b',
          position: 'relative',
          overflow: 'hidden',
          background: isRunning ? 'var(--bg-surface)' : 'var(--accent-orange)',
          filter: flashActive ? 'brightness(1.4)' : 'none',
          transition: 'filter 100ms, background 300ms',
        }}
        whileHover={isRunning ? {} : { filter: 'brightness(1.15)' }}
        animate={
          !isRunning
            ? {
                boxShadow: [
                  '0 0 8px rgba(255, 107, 0, 0.2)',
                  '0 0 20px rgba(255, 107, 0, 0.35)',
                  '0 0 8px rgba(255, 107, 0, 0.2)',
                ],
              }
            : {}
        }
        transition={
          !isRunning
            ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
            : {}
        }
      >
        {/* Scanning gradient overlay while running */}
        {isRunning && (
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255, 107, 0, 0.15) 50%, transparent 100%)',
              pointerEvents: 'none',
            }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        )}
        <span style={{ position: 'relative', zIndex: 1 }}>
          {isRunning ? 'Simulating...' : 'Run Simulation'}
        </span>
      </motion.button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Sub-components: SliderField, ToggleField
   ═══════════════════════════════════════════════════════════════════ */

function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  unit,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  unit: string
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '6px',
        }}
      >
        <label
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </label>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          height: '4px',
          appearance: 'none',
          WebkitAppearance: 'none',
          background: `linear-gradient(90deg, var(--accent-orange) ${((value - min) / (max - min)) * 100}%, var(--bg-surface) ${((value - min) / (max - min)) * 100}%)`,
          borderRadius: '2px',
          outline: 'none',
          cursor: 'pointer',
        }}
      />
    </div>
  )
}

function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div>
      <label
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          display: 'block',
          marginBottom: '6px',
        }}
      >
        {label}
      </label>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: '40px',
          height: '22px',
          borderRadius: '11px',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          background: value
            ? 'var(--accent-orange)'
            : 'var(--bg-surface)',
          transition: 'background 200ms',
          boxShadow: value
            ? '0 0 8px rgba(255, 107, 0, 0.3)'
            : 'inset 0 1px 3px rgba(0,0,0,0.3)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '3px',
            left: value ? '21px' : '3px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: value ? '#06060b' : 'var(--text-ghost)',
            transition: 'left 200ms var(--ease-out-expo)',
          }}
        />
      </button>
    </div>
  )
}
