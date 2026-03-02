"""Bitcoin network data loading and graph construction."""

from datetime import datetime, timezone

import networkx as nx
import numpy as np

from btc_threat_sim.models import NetworkState, PoolData

# Global hashrate: 600 EH/s
GLOBAL_HASHRATE: float = 600e18

# Hardcoded mining pool data (source: approximate 2024 distribution)
DEFAULT_POOLS: list[PoolData] = [
    PoolData(name="Foundry", hashpower_share=0.28, country="US"),
    PoolData(name="AntPool", hashpower_share=0.22, country="CN"),
    PoolData(name="F2Pool", hashpower_share=0.15, country="CN"),
    PoolData(name="ViaBTC", hashpower_share=0.10, country="CN"),
    PoolData(name="Others", hashpower_share=0.25, country="MIXED"),
]


def build_network_graph(
    pools: list[PoolData] | None = None,
    global_hashrate: float = GLOBAL_HASHRATE,
    fluctuate: bool = False,
    rng: np.random.Generator | None = None,
) -> NetworkState:
    """Build a NetworkX DiGraph from mining pool data.

    Args:
        pools: List of PoolData; defaults to DEFAULT_POOLS.
        global_hashrate: Total network hashrate in H/s.
        fluctuate: If True, apply ±5% random fluctuation to each pool's hashpower.
        rng: Optional numpy Generator for reproducible randomness.

    Returns:
        A NetworkState containing the constructed graph.
    """
    if pools is None:
        pools = DEFAULT_POOLS

    if rng is None:
        rng = np.random.default_rng()

    graph = nx.DiGraph()

    for pool in pools:
        share = pool.hashpower_share
        if fluctuate:
            # ±5% uniform fluctuation
            factor = rng.uniform(0.95, 1.05)
            share = share * factor

        graph.add_node(
            pool.name,
            hashpower_share=share,
            hashpower_absolute=share * global_hashrate,
            country=pool.country,
        )

    # Normalize shares so they sum to 1.0 after fluctuation
    if fluctuate:
        total = sum(graph.nodes[n]["hashpower_share"] for n in graph.nodes)
        for n in graph.nodes:
            graph.nodes[n]["hashpower_share"] /= total
            graph.nodes[n]["hashpower_absolute"] = (
                graph.nodes[n]["hashpower_share"] * global_hashrate
            )

    timestamp = datetime.now(timezone.utc).isoformat()
    return NetworkState(graph=graph, global_hashrate=global_hashrate, timestamp=timestamp)
