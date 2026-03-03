import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force'
import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

export interface PoolNode {
  name: string
  hashpower_share: number
  country: string
}

interface SimNode extends SimulationNodeDatum {
  id: string
  share: number
  country: string
  radius: number
  phase: number // random pulse offset
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  source: SimNode
  target: SimNode
}

interface NetworkGraphProps {
  networkState: PoolNode[]
  attackerPool?: string | null
  isSimulating?: boolean
}

/* ═══════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════ */

const W = 520
const H = 400
const CX = W / 2
const CY = H / 2
const MIN_R = 16
const MAX_R = 48

// Country codes → flag emoji (or fallback 2-letter)
const FLAGS: Record<string, string> = {
  US: '\u{1F1FA}\u{1F1F8}',
  CN: '\u{1F1E8}\u{1F1F3}',
  DE: '\u{1F1E9}\u{1F1EA}',
  MIXED: '\u{1F310}',
}

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

/** Log-scale radius from hashpower share */
function shareToRadius(share: number): number {
  const minS = 0.02
  const maxS = 0.5
  const clamped = Math.max(minS, Math.min(maxS, share))
  const t = (Math.log(clamped) - Math.log(minS)) / (Math.log(maxS) - Math.log(minS))
  return MIN_R + t * (MAX_R - MIN_R)
}

/** Build fully-connected edge list (every pool sees every other pool) */
function buildLinks(nodes: SimNode[]): SimLink[] {
  const links: SimLink[] = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      links.push({ source: nodes[i], target: nodes[j] })
    }
  }
  return links
}

/* ═══════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════ */

export function NetworkGraph({
  networkState,
  attackerPool = null,
  isSimulating = false,
}: NetworkGraphProps) {
  /* ── d3-force simulation state ─────────────────────────────── */
  const simRef = useRef<ReturnType<typeof forceSimulation<SimNode>> | null>(null)
  const [nodes, setNodes] = useState<SimNode[]>([])
  const [links, setLinks] = useState<SimLink[]>([])
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [tick, setTick] = useState(0) // force re-render on sim tick

  /* ── drag state ────────────────────────────────────────────── */
  const dragRef = useRef<{
    nodeId: string
    startX: number
    startY: number
  } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  /* ── build nodes from props ────────────────────────────────── */
  const initialNodes = useMemo<SimNode[]>(
    () =>
      networkState.map((p, i) => ({
        id: p.name,
        share: p.hashpower_share,
        country: p.country,
        radius: shareToRadius(p.hashpower_share),
        phase: Math.random() * Math.PI * 2,
        // initial positions in a circle to avoid stacking
        x: CX + 80 * Math.cos((i / networkState.length) * Math.PI * 2),
        y: CY + 80 * Math.sin((i / networkState.length) * Math.PI * 2),
      })),
    [networkState],
  )

  /* ── init / reset simulation ───────────────────────────────── */
  useEffect(() => {
    // Clean up previous
    simRef.current?.stop()

    const simNodes = initialNodes.map((n) => ({ ...n }))
    const simLinks = buildLinks(simNodes)

    const sim = forceSimulation<SimNode>(simNodes)
      .force('charge', forceManyBody<SimNode>().strength(-320))
      .force(
        'link',
        forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(120),
      )
      .force('center', forceCenter(CX, CY))
      .force(
        'collide',
        forceCollide<SimNode>().radius((d) => d.radius + 8),
      )
      .alphaDecay(0.03)
      .on('tick', () => {
        // Clamp nodes to viewport
        for (const n of simNodes) {
          n.x = Math.max(n.radius + 4, Math.min(W - n.radius - 4, n.x!))
          n.y = Math.max(n.radius + 4, Math.min(H - n.radius - 4, n.y!))
        }
        setNodes([...simNodes])
        setLinks([...simLinks])
        setTick((t) => t + 1)
      })

    simRef.current = sim

    return () => {
      sim.stop()
    }
  }, [initialNodes])

  /* ── drag handlers ─────────────────────────────────────────── */
  const getSvgPoint = useCallback(
    (e: React.MouseEvent): { x: number; y: number } | null => {
      const svg = svgRef.current
      if (!svg) return null
      const rect = svg.getBoundingClientRect()
      return {
        x: ((e.clientX - rect.left) / rect.width) * W,
        y: ((e.clientY - rect.top) / rect.height) * H,
      }
    },
    [],
  )

  const onMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.preventDefault()
      const pt = getSvgPoint(e)
      if (!pt) return
      dragRef.current = { nodeId, startX: pt.x, startY: pt.y }

      const sim = simRef.current
      if (sim) {
        sim.alphaTarget(0.3).restart()
        const node = nodes.find((n) => n.id === nodeId)
        if (node) {
          node.fx = node.x
          node.fy = node.y
        }
      }
    },
    [nodes, getSvgPoint],
  )

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragRef.current) return
      const pt = getSvgPoint(e)
      if (!pt) return

      const node = nodes.find((n) => n.id === dragRef.current!.nodeId)
      if (node) {
        node.fx = pt.x
        node.fy = pt.y
      }
    },
    [nodes, getSvgPoint],
  )

  const onMouseUp = useCallback(() => {
    if (!dragRef.current) return
    const node = nodes.find((n) => n.id === dragRef.current!.nodeId)
    if (node) {
      node.fx = null
      node.fy = null
    }
    dragRef.current = null
    simRef.current?.alphaTarget(0)
  }, [nodes])

  /* ── attacker "shake" offsets (destabilisation effect) ────── */
  const shakeOffsets = useMemo(() => {
    if (!isSimulating || !attackerPool) return {}
    const offsets: Record<string, { dx: number; dy: number }> = {}
    for (const n of nodes) {
      if (n.id !== attackerPool) {
        offsets[n.id] = {
          dx: (Math.random() - 0.5) * 3,
          dy: (Math.random() - 0.5) * 3,
        }
      }
    }
    return offsets
    // Re-compute shake offsets periodically via tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSimulating, attackerPool, Math.floor(tick / 3)])

  /* ── determine connected nodes for hover dimming ───────────── */
  const connectedToHovered = useMemo(() => {
    if (!hoveredNode) return null
    const set = new Set<string>([hoveredNode])
    for (const l of links) {
      if (l.source.id === hoveredNode) set.add(l.target.id)
      if (l.target.id === hoveredNode) set.add(l.source.id)
    }
    return set
  }, [hoveredNode, links])

  /* ── tooltip state ─────────────────────────────────────────── */
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    node: SimNode
  } | null>(null)

  const onNodeEnter = useCallback(
    (node: SimNode) => {
      setHoveredNode(node.id)
      setTooltip({ x: node.x!, y: node.y! - node.radius - 12, node })
    },
    [],
  )

  const onNodeLeave = useCallback(() => {
    setHoveredNode(null)
    setTooltip(null)
  }, [])

  /* ── radar grid rings ──────────────────────────────────────── */
  const gridRings = [90, 145, 195]

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{
          display: 'block',
          cursor: dragRef.current ? 'grabbing' : 'default',
          userSelect: 'none',
        }}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <defs>
          {/* Node glow filter */}
          <filter id="ng-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Attacker pulse glow */}
          <filter id="ng-atk-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ──────────── RADAR GRID ──────────── */}
        <g opacity={0.05} stroke="#ff6b00" fill="none" strokeWidth={0.5}>
          {gridRings.map((r) => (
            <circle key={r} cx={CX} cy={CY} r={r} />
          ))}
          {/* Crosshair lines */}
          <line x1={CX} y1={0} x2={CX} y2={H} opacity={0.4} />
          <line x1={0} y1={CY} x2={W} y2={CY} opacity={0.4} />
        </g>

        {/* ──────────── EDGES ──────────── */}
        <AnimatePresence>
          {links.map((l) => {
            const isAttackerEdge =
              isSimulating &&
              attackerPool &&
              (l.source.id === attackerPool || l.target.id === attackerPool)

            const isHoverConnected =
              hoveredNode &&
              (l.source.id === hoveredNode || l.target.id === hoveredNode)

            const edgeOpacity = hoveredNode
              ? isHoverConnected
                ? 1
                : 0.15
              : 0.6

            return (
              <motion.line
                key={`e-${l.source.id}-${l.target.id}`}
                x1={l.source.x!}
                y1={l.source.y!}
                x2={l.target.x!}
                y2={l.target.y!}
                stroke={
                  isAttackerEdge
                    ? '#ff4400'
                    : isHoverConnected
                      ? 'rgba(255, 120, 0, 0.25)'
                      : 'rgba(255, 120, 0, 0.08)'
                }
                strokeWidth={isAttackerEdge ? 1 : 0.5}
                opacity={edgeOpacity}
                initial={false}
                animate={
                  isAttackerEdge
                    ? { opacity: [0.3, 0.8, 0.3], strokeWidth: [0.5, 1.5, 0.5] }
                    : { opacity: edgeOpacity }
                }
                transition={
                  isAttackerEdge
                    ? { duration: 1, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.3 }
                }
              />
            )
          })}
        </AnimatePresence>

        {/* ──────────── NODES ──────────── */}
        <AnimatePresence>
          {nodes.map((node) => {
            const isAttacker = isSimulating && attackerPool === node.id
            const isDimmed =
              connectedToHovered && !connectedToHovered.has(node.id)
            const shake = shakeOffsets[node.id] ?? { dx: 0, dy: 0 }

            const nx = (node.x ?? CX) + (isSimulating ? shake.dx : 0)
            const ny = (node.y ?? CY) + (isSimulating ? shake.dy : 0)
            const r = node.radius
            const flag = FLAGS[node.country] ?? node.country

            return (
              <motion.g
                key={node.id}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{
                  opacity: isDimmed ? 0.2 : 1,
                  scale: 1,
                  x: nx,
                  y: ny,
                }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 200, damping: 30 }}
                style={{ cursor: 'grab' }}
                onMouseDown={(e) => onMouseDown(e, node.id)}
                onMouseEnter={() => onNodeEnter(node)}
                onMouseLeave={onNodeLeave}
              >
                {/* Pulse glow ring (behind the node) */}
                <motion.circle
                  r={r + 4}
                  fill="none"
                  stroke={isAttacker ? '#ff4400' : 'rgba(255, 107, 0, 0.12)'}
                  strokeWidth={isAttacker ? 2 : 1}
                  animate={{
                    scale: [1.0, 1.06, 1.0],
                    opacity: isAttacker ? [0.4, 0.9, 0.4] : [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: isAttacker ? 1.2 : 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: node.phase * 0.5,
                  }}
                  filter={isAttacker ? 'url(#ng-atk-glow)' : undefined}
                />

                {/* Main node circle */}
                <circle
                  r={r}
                  fill="#12121e"
                  stroke={isAttacker ? '#ff4400' : 'rgba(255, 120, 0, 0.25)'}
                  strokeWidth={isAttacker ? 2 : 1.5}
                />

                {/* Inner fill gradient (subtle convex look) */}
                <circle
                  r={r - 2}
                  fill="none"
                  stroke="rgba(255, 120, 0, 0.04)"
                  strokeWidth={r * 0.4}
                />

                {/* Hashpower % label (inside node) */}
                <text
                  y={1}
                  fill={isAttacker ? '#ff4400' : '#e8e4df'}
                  fontSize={r > 28 ? 13 : 10}
                  fontFamily="'JetBrains Mono', monospace"
                  fontWeight={600}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {(node.share * 100).toFixed(0)}%
                </text>

                {/* Pool name (below node) */}
                <text
                  y={r + 14}
                  fill="#8a8580"
                  fontSize={10}
                  fontFamily="'JetBrains Mono', monospace"
                  fontWeight={500}
                  textAnchor="middle"
                >
                  {node.id}
                </text>

                {/* Country flag/code (below name) */}
                <text
                  y={r + 26}
                  fill="#4a4540"
                  fontSize={10}
                  textAnchor="middle"
                >
                  {flag}
                </text>
              </motion.g>
            )
          })}
        </AnimatePresence>

        {/* ──────────── ATTACKER INDICATOR ──────────── */}
        <AnimatePresence>
          {isSimulating && attackerPool && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {(() => {
                const atkNode = nodes.find((n) => n.id === attackerPool)
                if (!atkNode) return null
                return (
                  <text
                    x={atkNode.x!}
                    y={atkNode.y! - atkNode.radius - 18}
                    fill="#ff4400"
                    fontSize={9}
                    fontFamily="'JetBrains Mono', monospace"
                    fontWeight={700}
                    textAnchor="middle"
                    letterSpacing="0.1em"
                  >
                    ATTACKER
                  </text>
                )
              })()}
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      {/* ──────────── TOOLTIP (HTML overlay) ──────────── */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              left: `${(tooltip.x / W) * 100}%`,
              top: `${(tooltip.y / H) * 100}%`,
              transform: 'translate(-50%, -100%)',
              pointerEvents: 'none',
              zIndex: 10,
              background: 'rgba(6, 6, 11, 0.92)',
              border: '1px solid rgba(255, 120, 0, 0.2)',
              borderRadius: '6px',
              padding: '8px 12px',
              backdropFilter: 'blur(8px)',
              whiteSpace: 'nowrap',
            }}
          >
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                fontWeight: 600,
                color: '#e8e4df',
                marginBottom: '2px',
              }}
            >
              {tooltip.node.id}
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '10px',
                color: '#8a8580',
                display: 'flex',
                gap: '10px',
              }}
            >
              <span>{(tooltip.node.share * 100).toFixed(1)}%</span>
              <span>{FLAGS[tooltip.node.country] ?? tooltip.node.country}</span>
              <span style={{ color: '#4a4540' }}>
                {(tooltip.node.share * 600).toFixed(0)} EH/s
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
