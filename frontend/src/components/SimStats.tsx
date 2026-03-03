import { GlassPanel, DataLabel } from './ui'

interface SimStatsProps {
  iterations: number
  meanSuccessRate: number
  stdDeviation: number
  executionTime: number
}

export function SimStats({
  iterations,
  meanSuccessRate,
  stdDeviation,
  executionTime,
}: SimStatsProps) {
  /* Spark bar: mean shown as filled bar, whiskers for ±std */
  const barW = '100%'
  const meanPct = Math.min(100, Math.max(0, meanSuccessRate * 100))
  const lowPct = Math.max(0, (meanSuccessRate - stdDeviation) * 100)
  const highPct = Math.min(100, (meanSuccessRate + stdDeviation) * 100)

  return (
    <GlassPanel>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
        }}
      >
        <DataLabel
          label="Iterations"
          value={iterations.toLocaleString()}
        />
        <DataLabel
          label="Mean Success"
          value={(meanSuccessRate * 100).toFixed(1)}
          unit="%"
        />
        <DataLabel
          label="Std Deviation"
          value={`±${(stdDeviation * 100).toFixed(1)}`}
          unit="%"
        />
        <DataLabel
          label="Exec Time"
          value={executionTime.toFixed(2)}
          unit="s"
        />
      </div>

      {/* Spark bar visualization */}
      <div
        style={{
          marginTop: '16px',
          position: 'relative',
          height: '12px',
          width: barW,
          background: 'var(--bg-surface)',
          borderRadius: '2px',
          overflow: 'visible',
        }}
      >
        {/* Mean fill */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${meanPct}%`,
            background: 'linear-gradient(90deg, rgba(255, 107, 0, 0.3), rgba(255, 107, 0, 0.6))',
            borderRadius: '2px 0 0 2px',
            transition: 'width 0.5s var(--ease-out-expo)',
          }}
        />

        {/* Std deviation whisker — low end */}
        <div
          style={{
            position: 'absolute',
            left: `${lowPct}%`,
            top: '-2px',
            width: '1px',
            height: '16px',
            background: 'var(--text-ghost)',
          }}
        />

        {/* Std deviation whisker — high end */}
        <div
          style={{
            position: 'absolute',
            left: `${highPct}%`,
            top: '-2px',
            width: '1px',
            height: '16px',
            background: 'var(--text-ghost)',
          }}
        />

        {/* Whisker connecting line */}
        <div
          style={{
            position: 'absolute',
            left: `${lowPct}%`,
            top: '5px',
            width: `${highPct - lowPct}%`,
            height: '1px',
            background: 'var(--text-ghost)',
          }}
        />

        {/* Mean marker dot */}
        <div
          style={{
            position: 'absolute',
            left: `${meanPct}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--accent-orange)',
            boxShadow: '0 0 6px rgba(255, 107, 0, 0.5)',
          }}
        />
      </div>

      {/* Spark bar labels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '4px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--text-ghost)',
          }}
        >
          0%
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--text-ghost)',
          }}
        >
          100%
        </span>
      </div>
    </GlassPanel>
  )
}
