"""Quantum computing threat simulation."""

import numpy as np
from scipy.stats import expon

from btc_threat_sim.models import NetworkState, SimResult

# Bitcoin uses 256-bit SHA-256 for mining and secp256k1 (256-bit) ECDSA for
# signatures.  Grover's algorithm effectively halves key security:
#   256-bit → 128-bit equivalent search space.
CLASSICAL_BITS = 256
GROVER_EFFECTIVE_BITS = 128

# Relevant timeframe: we consider a break "dangerous" if it can happen within
# this many years.  10 years is a common planning horizon.
RELEVANT_TIMEFRAME_YEARS = 10.0

# Mars-Earth one-way light-speed latency in minutes (~3-22 min depending on
# orbital position).  We use the average of ~12.5 min, rounded to the commonly
# cited ~20 min for a conservative worst-case planning figure.
MARS_EARTH_LATENCY_MIN = 20.0

# How much the interplanetary latency widens the reorg window (multiplier on
# risk).  A 20-min one-way delay means ~40 min round-trip, during which an
# attacker with a quantum advantage could reorganise the chain.
INTERPLANETARY_RISK_MULTIPLIER = 1.25


def simulate_quantum_threat(
    network_state: NetworkState,
    quantum_capability: float = 0.5,
    include_interplanetary: bool = False,
    iterations: int = 1000,
) -> SimResult:
    """Monte Carlo simulation of quantum threats to Bitcoin cryptography.

    Models time-to-break using an exponential distribution whose rate is
    parameterized by ``quantum_capability``.  Higher capability → shorter
    expected time-to-break → higher probability of breaking within the
    relevant timeframe → higher risk score.

    Args:
        network_state: Current network state (used for consistency with other sims).
        quantum_capability: Float 0.0-1.0 representing progress toward a
            cryptographically relevant quantum computer.
        include_interplanetary: If True, factor in Mars-Earth latency as an
            additional reorg-window risk multiplier.
        iterations: Number of Monte Carlo samples.

    Returns:
        SimResult with quantum-specific metadata.
    """
    # Edge case: zero capability means no quantum threat
    if quantum_capability <= 0.0:
        latency_factor = INTERPLANETARY_RISK_MULTIPLIER if include_interplanetary else 1.0
        return SimResult(
            scenario="quantum_break",
            risk_score=0.0,
            mean=0.0,
            std_dev=0.0,
            iterations=iterations,
            raw_results=[0.0] * iterations,
            metadata={
                "quantum_capability": 0.0,
                "time_to_break_mean": float("inf"),
                "latency_factor": latency_factor,
                "include_interplanetary": include_interplanetary,
                "effective_bits": GROVER_EFFECTIVE_BITS,
            },
        )

    # Scale parameter for the exponential distribution.
    # At capability=1.0 the expected time-to-break equals ~1 year (imminent).
    # At capability→0 the scale → ∞ (never breaks in practice).
    # We use: scale = base_years / capability^2  so that risk grows
    # super-linearly with capability, reflecting the enormous engineering
    # difficulty of each incremental qubit improvement.
    base_years = 2.0  # At full capability, mean break time ≈ 2 years
    scale = base_years / (quantum_capability ** 2)

    rng = np.random.default_rng()
    # Sample time-to-break (in years) for each iteration
    time_to_break_samples = expon.rvs(scale=scale, size=iterations, random_state=rng)

    # A "break" counts if it happens within the relevant timeframe
    breaks = (time_to_break_samples <= RELEVANT_TIMEFRAME_YEARS).astype(float)

    mean_break_rate = float(np.mean(breaks))
    std_break_rate = float(np.std(breaks))
    time_to_break_mean = float(np.mean(time_to_break_samples))

    # Interplanetary latency factor
    latency_factor = INTERPLANETARY_RISK_MULTIPLIER if include_interplanetary else 1.0

    # Risk score: break probability × 100 × latency factor, clamped 0-100
    risk_score = min(100.0, max(0.0, mean_break_rate * 100.0 * latency_factor))

    return SimResult(
        scenario="quantum_break",
        risk_score=risk_score,
        mean=mean_break_rate,
        std_dev=std_break_rate,
        iterations=iterations,
        raw_results=breaks.tolist(),
        metadata={
            "quantum_capability": quantum_capability,
            "time_to_break_mean": time_to_break_mean,
            "latency_factor": latency_factor,
            "include_interplanetary": include_interplanetary,
            "effective_bits": GROVER_EFFECTIVE_BITS,
        },
    )
