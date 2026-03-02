"""SimAgent — dispatches to simulation modules."""

from btc_threat_sim.models import NetworkState, SimResult
from btc_threat_sim.sims.fifty_one import simulate_51_attack
from btc_threat_sim.sims.game_theory import simulate_game_theory
from btc_threat_sim.sims.quantum import simulate_quantum_threat

SCENARIO_DISPATCH = {
    "51_attack": simulate_51_attack,
    "quantum_break": simulate_quantum_threat,
    "game_theory": simulate_game_theory,
}


class SimAgent:
    """Agent that dispatches simulation runs to the appropriate module."""

    def act(
        self, network_state: NetworkState, scenario: str, **kwargs
    ) -> SimResult:
        """Run a simulation for the given scenario.

        Args:
            network_state: Network graph to simulate against.
            scenario: One of "51_attack", "quantum_break", "game_theory".
            **kwargs: Passed through to the simulation function
                (e.g. iterations, attacker_hashpower, quantum_capability).

        Returns:
            SimResult from the selected simulation.

        Raises:
            ValueError: If scenario is not recognised.
        """
        sim_fn = SCENARIO_DISPATCH.get(scenario)
        if sim_fn is None:
            valid = ", ".join(sorted(SCENARIO_DISPATCH.keys()))
            raise ValueError(
                f"Unknown scenario '{scenario}'. Valid scenarios: {valid}"
            )

        return sim_fn(network_state, **kwargs)
