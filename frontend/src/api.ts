/* ═══════════════════════════════════════════════════════════════════
   API Client — btc-threat-sim backend
   ═══════════════════════════════════════════════════════════════════ */

const BASE_URL = '/api'

/* ── Response types ─────────────────────────────────────────────── */

export interface PoolInfo {
  name: string
  hashpower_share: number
  hashpower_eh: number
  country: string
}

export interface NetworkResponse {
  pools: PoolInfo[]
  global_hashrate: number
  global_hashrate_eh: number
  timestamp: string
  adjacency: Record<string, string[]>
}

export interface ScenarioInfo {
  id: string
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface StrategyInfo {
  name: string
  description: string
  priority: number
  references: string[]
}

export interface SimulationResponse {
  scenario: string
  risk_score: number
  simulation: {
    mean: number
    std_dev: number
    iterations: number
    metadata: Record<string, unknown>
  }
  strategies: StrategyInfo[]
  narrative: string
  network: NetworkResponse
}

/* ── Request types ──────────────────────────────────────────────── */

export interface SimulateParams {
  scenario: string
  iterations: number
  attacker_hashpower?: number | null
  quantum_capability?: number | null
  interplanetary?: boolean
}

/* ── Fetch helpers ──────────────────────────────────────────────── */

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText)
    throw new Error(`GET ${path} failed (${res.status}): ${detail}`)
  }
  return res.json()
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText)
    throw new Error(`POST ${path} failed (${res.status}): ${detail}`)
  }
  return res.json()
}

/* ── Public API ─────────────────────────────────────────────────── */

export function getNetworkState(): Promise<NetworkResponse> {
  return get<NetworkResponse>('/network')
}

export function getScenarios(): Promise<ScenarioInfo[]> {
  return get<ScenarioInfo[]>('/scenarios')
}

export function runSimulation(params: SimulateParams): Promise<SimulationResponse> {
  return post<SimulationResponse>('/simulate', params)
}
