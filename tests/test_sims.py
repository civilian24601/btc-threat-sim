"""Tests for simulation modules."""

import time

import pytest

from btc_threat_sim.data import build_network_graph
from btc_threat_sim.models import SimResult
from btc_threat_sim.sims.fifty_one import simulate_51_attack
from btc_threat_sim.sims.quantum import simulate_quantum_threat
from btc_threat_sim.sims.game_theory import simulate_game_theory


@pytest.fixture
def network_state():
    """Default network state for testing."""
    return build_network_graph()


# ---------- 51% attack tests ----------


class TestSimulate51Attack:
    """Tests for the 51% attack Monte Carlo simulation."""

    def test_returns_sim_result(self, network_state):
        result = simulate_51_attack(network_state, attacker_hashpower=0.3, iterations=100)
        assert isinstance(result, SimResult)
        assert result.scenario == "51_attack"

    def test_has_valid_fields(self, network_state):
        result = simulate_51_attack(network_state, attacker_hashpower=0.3, iterations=100)
        assert 0.0 <= result.risk_score <= 100.0
        assert 0.0 <= result.mean <= 1.0
        assert result.std_dev >= 0.0
        assert result.iterations == 100
        assert len(result.raw_results) == 100

    def test_50_percent_hashpower_high_risk(self, network_state):
        # Theoretical success rate ~61.3%; use 5000 iterations to reduce variance
        result = simulate_51_attack(
            network_state, attacker_hashpower=0.5, iterations=5000
        )
        assert result.risk_score > 60

    def test_10_percent_hashpower_low_risk(self, network_state):
        result = simulate_51_attack(
            network_state, attacker_hashpower=0.1, iterations=1000
        )
        assert result.risk_score < 30

    def test_zero_hashpower_risk_zero(self, network_state):
        result = simulate_51_attack(
            network_state, attacker_hashpower=0.0, iterations=100
        )
        assert result.risk_score == 0.0

    def test_100_percent_hashpower_risk_100(self, network_state):
        result = simulate_51_attack(
            network_state, attacker_hashpower=1.0, iterations=100
        )
        assert result.risk_score == 100.0

    def test_100_iterations_under_5_seconds(self, network_state):
        start = time.time()
        simulate_51_attack(network_state, attacker_hashpower=0.4, iterations=100)
        elapsed = time.time() - start
        assert elapsed < 5.0

    def test_auto_mode_picks_largest_pool(self, network_state):
        result = simulate_51_attack(
            network_state, attacker_hashpower="auto", iterations=100
        )
        assert result.metadata["attacker_name"] == "Foundry"
        assert result.metadata["attacker_hashpower"] == pytest.approx(0.28)

    def test_risk_scales_with_hashpower(self, network_state):
        low = simulate_51_attack(
            network_state, attacker_hashpower=0.1, iterations=1000
        )
        mid = simulate_51_attack(
            network_state, attacker_hashpower=0.3, iterations=1000
        )
        high = simulate_51_attack(
            network_state, attacker_hashpower=0.5, iterations=1000
        )
        assert low.risk_score <= mid.risk_score <= high.risk_score

    def test_geo_multiplier_applied_for_cn_pool(self, network_state):
        """AntPool (CN) should have geo multiplier 1.2 in metadata."""
        result = simulate_51_attack(
            network_state, attacker_hashpower=0.22, iterations=100
        )
        assert result.metadata["geo_multiplier"] == pytest.approx(1.2)

    def test_metadata_contains_required_keys(self, network_state):
        result = simulate_51_attack(
            network_state, attacker_hashpower=0.3, iterations=100
        )
        for key in [
            "attacker_hashpower",
            "attacker_name",
            "attacker_country",
            "block_depth",
            "geo_multiplier",
        ]:
            assert key in result.metadata


# ---------- Quantum threat tests ----------


class TestSimulateQuantumThreat:
    """Tests for the quantum threat simulation."""

    def test_returns_sim_result(self, network_state):
        result = simulate_quantum_threat(network_state, quantum_capability=0.5, iterations=100)
        assert isinstance(result, SimResult)
        assert result.scenario == "quantum_break"

    def test_has_valid_fields(self, network_state):
        result = simulate_quantum_threat(network_state, quantum_capability=0.5, iterations=100)
        assert 0.0 <= result.risk_score <= 100.0
        assert 0.0 <= result.mean <= 1.0
        assert result.std_dev >= 0.0
        assert result.iterations == 100
        assert len(result.raw_results) == 100

    def test_higher_capability_higher_risk(self, network_state):
        low = simulate_quantum_threat(
            network_state, quantum_capability=0.3, iterations=5000
        )
        high = simulate_quantum_threat(
            network_state, quantum_capability=0.9, iterations=5000
        )
        assert high.risk_score > low.risk_score

    def test_interplanetary_higher_risk(self, network_state):
        without = simulate_quantum_threat(
            network_state, quantum_capability=0.7, include_interplanetary=False, iterations=5000
        )
        with_ip = simulate_quantum_threat(
            network_state, quantum_capability=0.7, include_interplanetary=True, iterations=5000
        )
        assert with_ip.risk_score >= without.risk_score

    def test_zero_capability_near_zero_risk(self, network_state):
        result = simulate_quantum_threat(
            network_state, quantum_capability=0.0, iterations=100
        )
        assert result.risk_score == 0.0

    def test_full_capability_high_risk(self, network_state):
        result = simulate_quantum_threat(
            network_state, quantum_capability=1.0, iterations=5000
        )
        assert result.risk_score > 50

    def test_metadata_contains_quantum_keys(self, network_state):
        result = simulate_quantum_threat(network_state, quantum_capability=0.5, iterations=100)
        assert "time_to_break_mean" in result.metadata
        assert "latency_factor" in result.metadata
        assert "quantum_capability" in result.metadata
        assert "effective_bits" in result.metadata

    def test_latency_factor_value(self, network_state):
        result_no = simulate_quantum_threat(
            network_state, quantum_capability=0.5, include_interplanetary=False, iterations=100
        )
        result_yes = simulate_quantum_threat(
            network_state, quantum_capability=0.5, include_interplanetary=True, iterations=100
        )
        assert result_no.metadata["latency_factor"] == 1.0
        assert result_yes.metadata["latency_factor"] > 1.0

    def test_time_to_break_decreases_with_capability(self, network_state):
        low = simulate_quantum_threat(
            network_state, quantum_capability=0.3, iterations=5000
        )
        high = simulate_quantum_threat(
            network_state, quantum_capability=0.9, iterations=5000
        )
        assert high.metadata["time_to_break_mean"] < low.metadata["time_to_break_mean"]


# ---------- Game theory tests ----------


class TestSimulateGameTheory:
    """Tests for the game theory defection simulation."""

    def test_returns_sim_result(self, network_state):
        result = simulate_game_theory(network_state, iterations=100)
        assert isinstance(result, SimResult)
        assert result.scenario == "game_theory"

    def test_risk_score_in_valid_range(self, network_state):
        result = simulate_game_theory(network_state, iterations=1000)
        assert 0.0 <= result.risk_score <= 100.0

    def test_equilibrium_converged(self, network_state):
        result = simulate_game_theory(network_state, iterations=100)
        assert result.metadata["equilibrium_converged"] is True

    def test_nash_p_cooperate_in_range(self, network_state):
        result = simulate_game_theory(network_state, iterations=100)
        assert 0.0 <= result.metadata["nash_p_cooperate"] <= 1.0

    def test_pool_incentives_present(self, network_state):
        result = simulate_game_theory(network_state, iterations=100)
        incentives = result.metadata["pool_incentives"]
        assert isinstance(incentives, dict)
        assert len(incentives) == len(list(network_state.graph.nodes))

    def test_larger_pools_higher_defection_incentive(self, network_state):
        result = simulate_game_theory(network_state, iterations=100)
        incentives = result.metadata["pool_incentives"]
        # Foundry (28%) should have higher incentive than ViaBTC (10%)
        assert incentives["Foundry"] > incentives["ViaBTC"]

    def test_all_incentives_in_valid_range(self, network_state):
        result = simulate_game_theory(network_state, iterations=100)
        for pool, score in result.metadata["pool_incentives"].items():
            assert 0.0 <= score <= 1.0, f"{pool} incentive {score} out of range"

    def test_has_valid_statistics(self, network_state):
        result = simulate_game_theory(network_state, iterations=500)
        assert 0.0 <= result.mean <= 1.0
        assert result.std_dev >= 0.0
        assert result.iterations == 500
        assert len(result.raw_results) == 500

    def test_metadata_contains_required_keys(self, network_state):
        result = simulate_game_theory(network_state, iterations=100)
        for key in [
            "nash_p_cooperate",
            "nash_expected_payoff",
            "pool_incentives",
            "equilibrium_converged",
        ]:
            assert key in result.metadata
