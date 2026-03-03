import { animate, motion, useMotionValue } from 'framer-motion'
import { useEffect, useState } from 'react'

interface RiskGaugeProps {
  score: number
  scenario: string
  animateOnMount?: boolean
}

/* ═══════════════════════════════════════════════════════════════════
   Geometry constants
   ═══════════════════════════════════════════════════════════════════ */

const W = 280
const H = 215
const CX = 140
const CY = 152
const R = 110 // outer ring radius
const ARC_R = 101 // center of segment band
const ARC_W = 14 // segment band stroke width
const NEEDLE_LEN = 86
const PIVOT_R = 7

/* ═══════════════════════════════════════════════════════════════════
   Math helpers
   ═══════════════════════════════════════════════════════════════════ */

/** Gauge value (0-100) → angle in radians. 0 → π (left), 100 → 0 (right) */
function valToAngle(v: number): number {
  return Math.PI * (1 - v / 100)
}

/** Polar → SVG cartesian (y-axis flipped) */
function xy(angle: number, r: number): [number, number] {
  return [CX + r * Math.cos(angle), CY - r * Math.sin(angle)]
}

/** SVG arc path from gauge value v0 to v1 */
function arc(r: number, v0: number, v1: number): string {
  const a0 = valToAngle(v0)
  const a1 = valToAngle(v1)
  const [x0, y0] = xy(a0, r)
  const [x1, y1] = xy(a1, r)
  const large = a0 - a1 > Math.PI ? 1 : 0
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 0 ${x1} ${y1}`
}

/** Needle rotation: −90° (left, v=0) → +90° (right, v=100) */
function needleRot(v: number): number {
  return (v / 100) * 180 - 90
}

/** Risk-level color */
function riskColor(v: number): string {
  if (v < 30) return '#22c55e'
  if (v < 60) return '#f59e0b'
  if (v < 80) return '#ff4400'
  return '#dc2626'
}

/* ═══════════════════════════════════════════════════════════════════
   Static tick geometry (computed once)
   ═══════════════════════════════════════════════════════════════════ */

const MAJOR_VALS = [0, 25, 50, 75, 100]

interface MinorTick {
  x1: number; y1: number; x2: number; y2: number
}
interface MajorTick extends MinorTick {
  lx: number; ly: number; value: number
}

function buildTicks(): { minor: MinorTick[]; major: MajorTick[] } {
  const minor: MinorTick[] = []
  const major: MajorTick[] = []

  for (let i = 0; i <= 20; i++) {
    const v = (i / 20) * 100
    const a = valToAngle(v)
    const [ox, oy] = xy(a, R + 1)

    if (MAJOR_VALS.includes(Math.round(v))) {
      const [ix, iy] = xy(a, R - 14)
      const [lx, ly] = xy(a, R + 17)
      major.push({ x1: ox, y1: oy, x2: ix, y2: iy, lx, ly, value: Math.round(v) })
    } else {
      const [ix, iy] = xy(a, R - 7)
      minor.push({ x1: ox, y1: oy, x2: ix, y2: iy })
    }
  }
  return { minor, major }
}

const TICKS = buildTicks()

/* ═══════════════════════════════════════════════════════════════════
   Radial grid lines (protractor-style depth cue)
   ═══════════════════════════════════════════════════════════════════ */

const GRID_ANGLES = [0, 30, 60, 90, 120, 150, 180] // degrees
const GRID_RADII = [55, 75, 95] // concentric arcs

/* ═══════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════ */

export function RiskGauge({
  score,
  scenario,
  animateOnMount = true,
}: RiskGaugeProps) {
  const s = Math.max(0, Math.min(100, score))
  const color = riskColor(s)
  const rot = needleRot(s)
  const glowStd = 2 + (s / 100) * 6 // bloom scales 2→8 with score

  /* ── animated score counter ──────────────────────────────────── */
  const mv = useMotionValue(animateOnMount ? 0 : s)
  const [displayText, setDisplayText] = useState(
    animateOnMount ? '0.0' : s.toFixed(1),
  )
  const [displayColor, setDisplayColor] = useState(
    animateOnMount ? '#22c55e' : color,
  )

  useEffect(() => {
    const unsub = mv.on('change', (v: number) => {
      setDisplayText(v.toFixed(1))
      setDisplayColor(riskColor(v))
    })
    const ctrl = animate(mv, s, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
    })
    return () => {
      ctrl.stop()
      unsub()
    }
  }, [s, mv])

  /* ── danger-zone gradient endpoints ──────────────────────────── */
  const [dg0x, dg0y] = xy(valToAngle(60), ARC_R)
  const [dg1x, dg1y] = xy(valToAngle(100), ARC_R)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        style={{ overflow: 'visible', display: 'block' }}
      >
        {/* ──────────── DEFS ──────────── */}
        <defs>
          {/* Recessed inner-shadow for outer ring */}
          <filter id="rg-recess" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
            <feOffset dy="1" result="off" />
            <feFlood floodColor="#000" floodOpacity="0.5" result="c" />
            <feComposite in="c" in2="off" operator="in" result="sh" />
            <feComposite in="SourceGraphic" in2="sh" operator="over" />
          </filter>

          {/* Bloom glow for active arc — stdDeviation driven by score */}
          <filter id="rg-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation={glowStd}
              result="b"
            />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Needle drop-shadow */}
          <filter id="rg-ndl" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow
              dx="0"
              dy="1"
              stdDeviation="2"
              floodColor="#000"
              floodOpacity="0.6"
            />
          </filter>

          {/* Outer ring gradient (subtle → glow) */}
          <linearGradient id="rg-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,120,0,0.08)" />
            <stop offset="100%" stopColor="rgba(255,120,0,0.25)" />
          </linearGradient>

          {/* Pivot convex radial gradient */}
          <radialGradient id="rg-pivot" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#ff9d4d" />
            <stop offset="50%" stopColor="#ff6b00" />
            <stop offset="100%" stopColor="#b84a00" />
          </radialGradient>

          {/* 60-100 danger segment gradient (high → extreme) */}
          <linearGradient
            id="rg-danger"
            gradientUnits="userSpaceOnUse"
            x1={dg0x}
            y1={dg0y}
            x2={dg1x}
            y2={dg1y}
          >
            <stop offset="0%" stopColor="#ff4400" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>

        {/* ──────────── BACKGROUND GRID (depth cue) ──────────── */}
        <g opacity={0.06} stroke="#ff6b00" fill="none" strokeWidth={0.5}>
          {/* Concentric arcs */}
          {GRID_RADII.map((r) => (
            <path key={`gr${r}`} d={arc(r, 0, 100)} />
          ))}
          {/* Radial spokes */}
          {GRID_ANGLES.map((deg) => {
            const a = (deg / 180) * Math.PI
            const [x1, y1] = xy(a, 45)
            const [x2, y2] = xy(a, R - 3)
            return (
              <line
                key={`gs${deg}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                opacity={0.6}
              />
            )
          })}
        </g>

        {/* ──────────── COLORED SEGMENT ARCS (15 % backdrop) ──────────── */}
        <path
          d={arc(ARC_R, 0, 30)}
          fill="none"
          stroke="#22c55e"
          strokeWidth={ARC_W}
          strokeLinecap="butt"
          opacity={0.15}
        />
        <path
          d={arc(ARC_R, 30, 60)}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={ARC_W}
          strokeLinecap="butt"
          opacity={0.15}
        />
        <path
          d={arc(ARC_R, 60, 100)}
          fill="none"
          stroke="url(#rg-danger)"
          strokeWidth={ARC_W}
          strokeLinecap="butt"
          opacity={0.15}
        />

        {/* ──────────── OUTER RING (bevel: dark inner + bright main + faint outer) ── */}
        <path
          d={arc(R + 1.5, 0, 100)}
          fill="none"
          stroke="rgba(0,0,0,0.35)"
          strokeWidth={1}
        />
        <path
          d={arc(R, 0, 100)}
          fill="none"
          stroke="url(#rg-ring)"
          strokeWidth={3}
          filter="url(#rg-recess)"
        />
        <path
          d={arc(R - 1.5, 0, 100)}
          fill="none"
          stroke="rgba(255,120,0,0.04)"
          strokeWidth={0.5}
        />

        {/* ──────────── ACTIVE ARC (full brightness + bloom) ──────────── */}
        {s > 0.5 && (
          <motion.path
            d={arc(ARC_R, 0, s)}
            fill="none"
            stroke={color}
            strokeWidth={ARC_W - 2}
            strokeLinecap="butt"
            filter="url(#rg-glow)"
            initial={{ pathLength: animateOnMount ? 0 : 1, opacity: 0.9 }}
            animate={{ pathLength: 1, opacity: 0.9 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
        )}

        {/* ──────────── TICK MARKS ──────────── */}
        {TICKS.minor.map((t, i) => (
          <line
            key={`tm${i}`}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="#4a4540"
            strokeWidth={1}
          />
        ))}
        {TICKS.major.map((t) => (
          <g key={`tM${t.value}`}>
            <line
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke="#8a8580"
              strokeWidth={2}
            />
            <text
              x={t.lx}
              y={t.ly}
              fill="#8a8580"
              fontSize={10}
              fontFamily="'JetBrains Mono', monospace"
              fontWeight={500}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {t.value}
            </text>
          </g>
        ))}

        {/* ──────────── NEEDLE ──────────── */}
        <motion.g
          style={{ transformOrigin: `${CX}px ${CY}px` }}
          initial={{ rotate: animateOnMount ? -90 : rot }}
          animate={{ rotate: rot }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          filter="url(#rg-ndl)"
        >
          <polygon
            points={`
              ${CX - 2},${CY + 5}
              ${CX - 0.4},${CY - NEEDLE_LEN}
              ${CX + 0.4},${CY - NEEDLE_LEN}
              ${CX + 2},${CY + 5}
            `}
            fill={color}
            opacity={0.92}
          />
        </motion.g>

        {/* ──────────── PIVOT CIRCLE (convex) ──────────── */}
        <circle
          cx={CX}
          cy={CY}
          r={PIVOT_R}
          fill="url(#rg-pivot)"
          filter="url(#rg-ndl)"
        />
        {/* Specular highlight ring */}
        <circle
          cx={CX}
          cy={CY}
          r={PIVOT_R - 2}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={0.5}
        />

        {/* ──────────── SCORE READOUT ──────────── */}
        <text
          x={CX}
          y={CY + 30}
          fill={displayColor}
          fontSize={32}
          fontFamily="'JetBrains Mono', monospace"
          fontWeight={700}
          textAnchor="middle"
          dominantBaseline="auto"
        >
          {displayText}
        </text>
        <text
          x={CX}
          y={CY + 46}
          fill="#4a4540"
          fontSize={9}
          fontFamily="'JetBrains Mono', monospace"
          fontWeight={500}
          textAnchor="middle"
          letterSpacing="0.15em"
        >
          RISK SCORE
        </text>

        {/* ──────────── SCENARIO LABEL ──────────── */}
        <text
          x={CX}
          y={H - 2}
          fill="#8a8580"
          fontSize={11}
          fontFamily="'JetBrains Mono', monospace"
          fontWeight={500}
          textAnchor="middle"
          letterSpacing="0.08em"
        >
          {scenario.replace(/_/g, ' ').toUpperCase()}
        </text>
      </svg>
    </div>
  )
}
