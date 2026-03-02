"""51% attack Monte Carlo simulation."""

import numpy as np
from scipy.stats import binom

from btc_threat_sim.models import NetworkState, SimResult

# Geopolitical risk multipliers by country code
GEO_RISK_MULTIPLIERS: dict[str, float] = {
    "CN": 1.2,
    "RU": 1.15,
    "MIXED": 1.0,
    "US": 1.0,
}


def _find_largest_pool(network_state: NetworkState) -> tuple[str, float, str]:
    """Return (name, hashpower_share, country) of the largest pool."""
    graph = network_state.graph
    largest = max(graph.nodes, key=lambda n: graph.nodes[n]["hashpower_share"])
    attrs = graph.nodes[largest]
    return largest, attrs["hashpower_share"], attrs["country"]


def simulate_51_attack(
    network_state: NetworkState,
    attacker_hashpower: float | str = "auto",
    block_depth: int = 6,
    iterations: int = 1000,
) -> SimResult:
    """Run a Monte Carlo simulation of a 51% double-spend attack.

    For each iteration, uses a binomial model: the attacker mines blocks with
    probability = attacker_hashpower. A successful attack means the attacker
    mines >= block_depth blocks out of 2*block_depth rounds (i.e. builds a
    chain at least as long as the honest chain over the race window).

    Args:
        network_state: Current network graph with pool data.
        attacker_hashpower: Float 0.0-1.0, or "auto" to pick the largest pool.
        block_depth: Confirmation depth the attacker must overcome (default 6).
        iterations: Number of Monte Carlo iterations.

    Returns:
        SimResult with risk_score on 0-100 scale.
    """
    # Resolve attacker hashpower
    attacker_country = "MIXED"
    attacker_name = "unknown"

    if attacker_hashpower == "auto":
        attacker_name, attacker_hashpower, attacker_country = _find_largest_pool(
            network_state
        )
    elif isinstance(attacker_hashpower, (int, float)):
        # Try to identify country if hashpower matches a known pool
        for node in network_state.graph.nodes:
            attrs = network_state.graph.nodes[node]
            if abs(attrs["hashpower_share"] - attacker_hashpower) < 1e-9:
                attacker_country = attrs["country"]
                attacker_name = node
                break
    else:
        raise ValueError(f"Invalid attacker_hashpower: {attacker_hashpower}")

    q = float(attacker_hashpower)

    # Edge cases
    if q <= 0.0:
        return SimResult(
            scenario="51_attack",
            risk_score=0.0,
            mean=0.0,
            std_dev=0.0,
            iterations=iterations,
            raw_results=[0.0] * iterations,
            metadata={
                "attacker_hashpower": 0.0,
                "attacker_name": attacker_name,
                "attacker_country": attacker_country,
                "block_depth": block_depth,
                "geo_multiplier": 1.0,
            },
        )

    if q >= 1.0:
        return SimResult(
            scenario="51_attack",
            risk_score=100.0,
            mean=1.0,
            std_dev=0.0,
            iterations=iterations,
            raw_results=[1.0] * iterations,
            metadata={
                "attacker_hashpower": 1.0,
                "attacker_name": attacker_name,
                "attacker_country": attacker_country,
                "block_depth": block_depth,
                "geo_multiplier": 1.0,
            },
        )

    # Monte Carlo: for each iteration, simulate a chain race over 2*block_depth
    # blocks.  The attacker wins if they mine at least block_depth of them.
    n_trials = 2 * block_depth
    rng = np.random.default_rng()

    # Vectorised: draw attacker block counts for all iterations at once
    attacker_blocks = rng.binomial(n=n_trials, p=q, size=iterations)
    successes = (attacker_blocks >= block_depth).astype(float)

    mean_success = float(np.mean(successes))
    std_success = float(np.std(successes))

    # Apply geopolitical risk multiplier
    geo_mult = GEO_RISK_MULTIPLIERS.get(attacker_country, 1.0)

    # Risk score: success rate × 100, scaled by geo multiplier, clamped to 0-100
    risk_score = min(100.0, max(0.0, mean_success * 100.0 * geo_mult))

    return SimResult(
        scenario="51_attack",
        risk_score=risk_score,
        mean=mean_success,
        std_dev=std_success,
        iterations=iterations,
        raw_results=successes.tolist(),
        metadata={
            "attacker_hashpower": q,
            "attacker_name": attacker_name,
            "attacker_country": attacker_country,
            "block_depth": block_depth,
            "geo_multiplier": geo_mult,
        },
    )
