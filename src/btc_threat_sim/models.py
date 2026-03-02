"""Data models for btc-threat-sim."""

from dataclasses import dataclass, field
from typing import Any

import networkx as nx


@dataclass
class PoolData:
    """Mining pool identity and hashpower share."""

    name: str
    hashpower_share: float
    country: str


@dataclass
class NetworkState:
    """Snapshot of the Bitcoin mining network at a point in time."""

    graph: nx.DiGraph
    global_hashrate: float
    timestamp: str


@dataclass
class SimResult:
    """Output of a single simulation run."""

    scenario: str
    risk_score: float
    mean: float
    std_dev: float
    iterations: int
    raw_results: list[float] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class DefenseStrategy:
    """A recommended defense against a simulated threat."""

    name: str
    description: str
    priority: int
    references: list[str] = field(default_factory=list)


@dataclass
class ThreatReport:
    """Complete report combining simulation results and defense strategies."""

    scenario: str
    sim_result: SimResult
    strategies: list[DefenseStrategy]
    narrative: str
