"""FastAPI backend wrapper for the btc-threat-sim agent pipeline."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from btc_threat_sim.agents.data_agent import DataAgent
from btc_threat_sim.agents.sim_agent import SimAgent
from btc_threat_sim.agents.strategy_agent import StrategyAgent
from btc_threat_sim.models import PoolData, ThreatReport
from btc_threat_sim.report import format_json_report

log = logging.getLogger("btc_threat_sim")

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="btc-threat-sim",
    description="AI-Driven Bitcoin Network Threat Simulator — REST API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Pydantic request / helper models
# ---------------------------------------------------------------------------

SCENARIOS = ["51_attack", "quantum_break", "game_theory"]

SCENARIO_NARRATIVES = {
    "51_attack": (
        "This simulation models the probability of a successful double-spend "
        "attack where an adversary controls a significant share of Bitcoin's "
        "total hashpower. Using a binomial chain-race model over {iterations} "
        "Monte Carlo iterations, the attacker's ability to build a longer "
        "chain than the honest network is evaluated. Geopolitical risk "
        "multipliers adjust the score based on the attacker's jurisdiction."
    ),
    "quantum_break": (
        "This simulation estimates the timeline for quantum computers to "
        "threaten Bitcoin's cryptographic foundations. Grover's algorithm "
        "effectively halves SHA-256's security (256-bit -> 128-bit equivalent). "
        "Using an exponential time-to-break model over {iterations} iterations, "
        "the probability of a cryptographically relevant break within the "
        "planning horizon is assessed."
    ),
    "game_theory": (
        "This simulation models the incentive landscape for mining pool "
        "cooperation vs. defection using a prisoner's dilemma framework. "
        "Nash equilibrium analysis reveals the stable mixed strategy, while "
        "per-pool incentive scores highlight which actors have the greatest "
        "motivation to deviate from cooperative mining over {iterations} "
        "simulated rounds."
    ),
}


class PoolInput(BaseModel):
    """A single mining pool in a custom pool list."""

    name: str
    hashpower_share: float = Field(ge=0, le=1)
    country: str = "UNKNOWN"


class SimulateRequest(BaseModel):
    """Request body for POST /api/simulate."""

    scenario: str
    iterations: int = Field(default=1000, ge=1)
    attacker_hashpower: float | None = Field(default=None, ge=0, le=1)
    quantum_capability: float | None = Field(default=None, ge=0, le=1)
    interplanetary: bool = False
    pools: list[PoolInput] | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _serialize_network(network_state) -> dict[str, Any]:
    """Convert a NetworkState (with DiGraph) to a JSON-friendly dict."""
    graph = network_state.graph
    pools = []
    for node in sorted(
        graph.nodes,
        key=lambda n: graph.nodes[n]["hashpower_share"],
        reverse=True,
    ):
        attrs = graph.nodes[node]
        pools.append(
            {
                "name": node,
                "hashpower_share": attrs["hashpower_share"],
                "hashpower_eh": attrs["hashpower_absolute"] / 1e18,
                "country": attrs["country"],
            }
        )

    return {
        "pools": pools,
        "global_hashrate": network_state.global_hashrate,
        "global_hashrate_eh": network_state.global_hashrate / 1e18,
        "timestamp": network_state.timestamp,
        "adjacency": {
            node: list(graph.successors(node)) for node in graph.nodes
        },
    }


def _run_pipeline(
    scenario: str,
    iterations: int = 1000,
    attacker_hashpower: float | str | None = None,
    quantum_capability: float | None = None,
    interplanetary: bool = False,
    pools: list[PoolData] | None = None,
) -> tuple[ThreatReport, Any]:
    """Run the full DataAgent → SimAgent → StrategyAgent pipeline.

    Returns:
        Tuple of (ThreatReport, NetworkState).
    """
    data_agent = DataAgent()
    sim_agent = SimAgent()
    strategy_agent = StrategyAgent()

    network_state = data_agent.act(pools=pools)

    # Build kwargs for the simulation
    kwargs: dict[str, Any] = {"iterations": iterations}
    if scenario == "51_attack":
        kwargs["attacker_hashpower"] = attacker_hashpower if attacker_hashpower is not None else "auto"
    elif scenario == "quantum_break":
        if quantum_capability is not None:
            kwargs["quantum_capability"] = quantum_capability
        kwargs["include_interplanetary"] = interplanetary

    sim_result = sim_agent.act(network_state, scenario, **kwargs)
    strategies = strategy_agent.act(sim_result)

    narrative = SCENARIO_NARRATIVES.get(scenario, "").format(
        iterations=sim_result.iterations,
    )

    report = ThreatReport(
        scenario=scenario,
        sim_result=sim_result,
        strategies=strategies,
        narrative=narrative,
    )

    return report, network_state


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/scenarios")
def get_scenarios() -> list[dict]:
    """Return available simulation scenarios with descriptions and parameter schemas."""
    return [
        {
            "id": "51_attack",
            "name": "51% Attack Simulation",
            "description": (
                "Monte Carlo simulation of double-spend attacks using "
                "binomial chain-race probabilities with geopolitical risk multipliers."
            ),
            "parameters": {
                "iterations": {"type": "integer", "default": 1000, "min": 1},
                "attacker_hashpower": {
                    "type": "number",
                    "default": "auto",
                    "min": 0,
                    "max": 1,
                    "description": "Attacker hashpower fraction (0.0-1.0) or null for auto",
                },
            },
        },
        {
            "id": "quantum_break",
            "name": "Quantum Threat Simulation",
            "description": (
                "Models quantum computing impact on SHA-256 mining and ECDSA "
                "key security with optional interplanetary latency factor."
            ),
            "parameters": {
                "iterations": {"type": "integer", "default": 1000, "min": 1},
                "quantum_capability": {
                    "type": "number",
                    "default": 0.5,
                    "min": 0,
                    "max": 1,
                    "description": "Quantum capability level (0.0-1.0)",
                },
                "interplanetary": {
                    "type": "boolean",
                    "default": False,
                    "description": "Enable Mars-Earth latency factor",
                },
            },
        },
        {
            "id": "game_theory",
            "name": "Game Theory Defection Analysis",
            "description": (
                "Prisoner's dilemma modeling of mining pool cooperation vs. "
                "defection with Nash equilibrium and per-pool incentive scores."
            ),
            "parameters": {
                "iterations": {"type": "integer", "default": 1000, "min": 1},
            },
        },
    ]


@app.get("/api/network")
def get_network() -> dict:
    """Return the current Bitcoin mining network state."""
    data_agent = DataAgent()
    network_state = data_agent.act()
    return _serialize_network(network_state)


@app.post("/api/simulate")
def post_simulate(req: SimulateRequest) -> dict:
    """Run a threat simulation through the full agent pipeline."""
    if req.scenario not in SCENARIOS:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown scenario '{req.scenario}'. Must be one of: {SCENARIOS}",
        )

    # Convert Pydantic PoolInput to domain PoolData
    pools = None
    if req.pools:
        pools = [
            PoolData(
                name=p.name,
                hashpower_share=p.hashpower_share,
                country=p.country,
            )
            for p in req.pools
        ]

    try:
        report, network_state = _run_pipeline(
            scenario=req.scenario,
            iterations=req.iterations,
            attacker_hashpower=req.attacker_hashpower,
            quantum_capability=req.quantum_capability,
            interplanetary=req.interplanetary,
            pools=pools,
        )
    except (ValueError, TypeError) as e:
        raise HTTPException(status_code=400, detail=str(e))

    result = format_json_report(report)
    result["network"] = _serialize_network(network_state)
    return result
