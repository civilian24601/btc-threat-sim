import { useCallback, useRef, useState } from 'react'
import {
  getNetworkState,
  runSimulation as apiRunSimulation,
  type NetworkResponse,
  type SimulateParams,
  type SimulationResponse,
  type StrategyInfo,
} from '../api'
import type { PoolNode } from '../components/NetworkGraph'

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

export interface ConsoleEntry {
  timestamp: string
  agent: string
  message: string
}

export type SimState = 'idle' | 'loading' | 'complete' | 'error'

export interface SimulationData {
  riskScore: number
  iterations: number
  mean: number
  stdDev: number
  executionTime: number
  strategies: StrategyInfo[]
  attackerPool: string | null
  narrative: string
}

/* ═══════════════════════════════════════════════════════════════════
   Hook
   ═══════════════════════════════════════════════════════════════════ */

function ts(): string {
  const d = new Date()
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

const SCENARIO_LABELS: Record<string, string> = {
  '51_attack': '51% attack',
  quantum_break: 'quantum threat',
  game_theory: 'game theory',
}

export function useSimulation() {
  const [state, setState] = useState<SimState>('idle')
  const [pools, setPools] = useState<PoolNode[]>([])
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([])
  const [data, setData] = useState<SimulationData | null>(null)
  const abortRef = useRef(false)

  /* ── Helper to append a console entry ────────────────────────── */
  const log = useCallback((agent: string, message: string) => {
    setConsoleEntries((prev) => [...prev, { timestamp: ts(), agent, message }])
  }, [])

  /* ── Fetch initial network state ─────────────────────────────── */
  const fetchNetwork = useCallback(async () => {
    try {
      const net: NetworkResponse = await getNetworkState()
      setPools(
        net.pools.map((p) => ({
          name: p.name,
          hashpower_share: p.hashpower_share,
          country: p.country,
        })),
      )
    } catch {
      // Silently fall back to empty — App.tsx will use defaults
    }
  }, [])

  /* ── Run simulation ──────────────────────────────────────────── */
  const run = useCallback(
    async (params: SimulateParams) => {
      abortRef.current = false
      setState('loading')
      setData(null)

      const label = SCENARIO_LABELS[params.scenario] ?? params.scenario

      log('System', 'Initializing threat simulation pipeline...')
      await delay(400)
      if (abortRef.current) return

      log('DataAgent', 'Loading network state...')
      await delay(400)
      if (abortRef.current) return

      log(
        'SimAgent',
        `Running ${label} simulation (${params.iterations.toLocaleString()} iterations)...`,
      )

      const t0 = performance.now()
      let res: SimulationResponse
      try {
        res = await apiRunSimulation(params)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        log('System', `ERROR: ${msg}`)
        setState('error')
        return
      }
      const elapsed = (performance.now() - t0) / 1000

      if (abortRef.current) return

      log(
        'SimAgent',
        `Simulation complete — risk score: ${res.risk_score.toFixed(1)}`,
      )
      await delay(300)
      if (abortRef.current) return

      log(
        'StrategyAgent',
        `Analyzing results... ${res.strategies.length} defense strategies generated.`,
      )

      // Update pools from response network
      if (res.network?.pools) {
        setPools(
          res.network.pools.map((p) => ({
            name: p.name,
            hashpower_share: p.hashpower_share,
            country: p.country,
          })),
        )
      }

      // Determine attacker pool for 51% attack
      let attackerPool: string | null = null
      if (
        params.scenario === '51_attack' &&
        res.simulation.metadata?.attacker_name
      ) {
        attackerPool = res.simulation.metadata.attacker_name as string
      }

      setData({
        riskScore: res.risk_score,
        iterations: res.simulation.iterations,
        mean: res.simulation.mean,
        stdDev: res.simulation.std_dev,
        executionTime: elapsed,
        strategies: res.strategies,
        attackerPool,
        narrative: res.narrative,
      })

      setState('complete')
    },
    [log],
  )

  /* ── Reset (on scenario change) ──────────────────────────────── */
  const reset = useCallback(() => {
    abortRef.current = true
    setState('idle')
    setData(null)
    setConsoleEntries([])
  }, [])

  return {
    state,
    pools,
    consoleEntries,
    data,
    fetchNetwork,
    run,
    reset,
  }
}
