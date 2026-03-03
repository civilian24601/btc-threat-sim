import { useCallback, useEffect, useRef, useState } from 'react'
import type { SimulateParams } from './api'
import { NetworkGraph, type PoolNode } from './components/NetworkGraph'
import { RiskGauge } from './components/RiskGauge'
import { ScenarioSelector, type ScenarioId } from './components/ScenarioSelector'
import { SimConsole } from './components/SimConsole'
import { SimStats } from './components/SimStats'
import { StrategyCards } from './components/StrategyCards'
import { GlassPanel, ScanLine } from './components/ui'
import { useSimulation } from './hooks/useSimulation'

/* ═══════════════════════════════════════════════════════════════════
   Fallback pool data (used when backend is unreachable)
   ═══════════════════════════════════════════════════════════════════ */

const DEFAULT_POOLS: PoolNode[] = [
  { name: 'Foundry', hashpower_share: 0.28, country: 'US' },
  { name: 'AntPool', hashpower_share: 0.22, country: 'CN' },
  { name: 'F2Pool', hashpower_share: 0.15, country: 'CN' },
  { name: 'ViaBTC', hashpower_share: 0.10, country: 'CN' },
  { name: 'Others', hashpower_share: 0.25, country: 'MIXED' },
]

/* ═══════════════════════════════════════════════════════════════════
   App
   ═══════════════════════════════════════════════════════════════════ */

function App() {
  const sim = useSimulation()
  const prevScenarioRef = useRef<ScenarioId | null>(null)

  const [params, setParams] = useState({
    scenario: '51_attack' as ScenarioId,
    iterations: 1000,
    attackerHashpower: 35,
    quantumCapability: 50,
    interplanetary: false,
  })

  /* ── Fetch network state on mount ────────────────────────────── */
  useEffect(() => {
    sim.fetchNetwork()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Reset on scenario change ────────────────────────────────── */
  useEffect(() => {
    if (prevScenarioRef.current !== null && prevScenarioRef.current !== params.scenario) {
      sim.reset()
    }
    prevScenarioRef.current = params.scenario
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.scenario])

  /* ── Run simulation ──────────────────────────────────────────── */
  const handleRun = useCallback(() => {
    const apiParams: SimulateParams = {
      scenario: params.scenario,
      iterations: params.iterations,
    }

    if (params.scenario === '51_attack') {
      apiParams.attacker_hashpower = params.attackerHashpower / 100
    } else if (params.scenario === 'quantum_break') {
      apiParams.quantum_capability = params.quantumCapability / 100
      apiParams.interplanetary = params.interplanetary
    }

    sim.run(apiParams)
  }, [params, sim])

  /* ── Keyboard shortcuts ──────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'Enter' && sim.state !== 'loading') {
        e.preventDefault()
        handleRun()
      } else if (e.key === '1') {
        setParams((p) => ({ ...p, scenario: '51_attack' }))
      } else if (e.key === '2') {
        setParams((p) => ({ ...p, scenario: 'quantum_break' }))
      } else if (e.key === '3') {
        setParams((p) => ({ ...p, scenario: 'game_theory' }))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleRun, sim.state])

  /* ── Derived state ───────────────────────────────────────────── */
  const isLoading = sim.state === 'loading'
  const networkPools = sim.pools.length > 0 ? sim.pools : DEFAULT_POOLS
  const riskScore = sim.data?.riskScore ?? 0
  const attackerPool = isLoading && params.scenario === '51_attack'
    ? networkPools[0]?.name ?? null
    : sim.data?.attackerPool ?? null

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '24px',
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--panel-gap)',
        position: 'relative',
      }}
    >
      {/* ━━━ CRT vignette overlay ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 9998,
          background:
            'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)',
          opacity: 0.5,
        }}
      />

      {/* ━━━ Horizontal scanlines ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 9997,
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)',
          opacity: 0.35,
        }}
      />

      {/* ━━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              margin: 0,
              textShadow:
                '0 0 10px rgba(255, 107, 0, 0.25), 0 0 30px rgba(255, 107, 0, 0.08)',
            }}
          >
            BTC THREAT SIM
          </h1>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 500,
              color: 'var(--text-ghost)',
              letterSpacing: '0.06em',
            }}
          >
            v0.1.0
          </span>
        </div>
      </header>

      {/* ━━━ SCENARIO SELECTOR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <GlassPanel index={0}>
        <ScenarioSelector
          value={params}
          onChange={setParams}
          onRun={handleRun}
          isRunning={isLoading}
        />
      </GlassPanel>

      {/* ━━━ MAIN GRID: Risk Gauge + Network Graph ━━━━━━━━━━━━━━━━━ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.5fr',
          gap: 'var(--panel-gap)',
        }}
      >
        {/* Left: Risk Gauge */}
        <GlassPanel index={1} glow>
          <ScanLine />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <RiskGauge
              score={riskScore}
              scenario={params.scenario}
              animateOnMount={sim.state === 'complete'}
            />
          </div>
        </GlassPanel>

        {/* Right: Network Graph */}
        <GlassPanel index={2} noPadding>
          <div style={{ padding: 'var(--panel-padding) var(--panel-padding) 0' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                margin: '0 0 4px 0',
              }}
            >
              Network Topology
            </h2>
          </div>
          <NetworkGraph
            networkState={networkPools}
            attackerPool={attackerPool}
            isSimulating={isLoading || (sim.state === 'complete' && attackerPool !== null)}
          />
        </GlassPanel>
      </div>

      {/* ━━━ SECOND ROW: Sim Stats + Strategy Cards ━━━━━━━━━━━━━━━ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.5fr',
          gap: 'var(--panel-gap)',
        }}
      >
        {/* Left: Sim Stats */}
        <SimStats
          iterations={sim.data?.iterations ?? 0}
          meanSuccessRate={sim.data?.mean ?? 0}
          stdDeviation={sim.data?.stdDev ?? 0}
          executionTime={sim.data?.executionTime ?? 0}
        />

        {/* Right: Strategy Cards */}
        <GlassPanel index={4}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              margin: '0 0 12px 0',
            }}
          >
            Defense Strategies
          </h2>
          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {sim.data?.strategies && sim.data.strategies.length > 0 ? (
              <StrategyCards strategies={sim.data.strategies} />
            ) : (
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--text-ghost)',
                  textAlign: 'center',
                  padding: '32px 0',
                }}
              >
                {sim.state === 'idle'
                  ? 'Run a simulation to generate strategies'
                  : sim.state === 'loading'
                    ? 'Analyzing...'
                    : 'No strategies available'}
              </div>
            )}
          </div>
        </GlassPanel>
      </div>

      {/* ━━━ CONSOLE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <GlassPanel index={5}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            margin: '0 0 10px 0',
          }}
        >
          Simulation Console
        </h2>
        <SimConsole entries={sim.consoleEntries} />
      </GlassPanel>
    </div>
  )
}

export default App
