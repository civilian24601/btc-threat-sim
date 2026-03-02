"""Tests for agent classes."""

import pytest

from btc_threat_sim.agents.data_agent import DataAgent
from btc_threat_sim.agents.sim_agent import SimAgent
from btc_threat_sim.agents.strategy_agent import StrategyAgent
from btc_threat_sim.models import (
    DefenseStrategy,
    NetworkState,
    PoolData,
    SimResult,
)


# ---------- DataAgent tests ----------


class TestDataAgent:
    """Tests for DataAgent."""

    def test_returns_network_state(self):
        agent = DataAgent()
        state = agent.act()
        assert isinstance(state, NetworkState)

    def test_default_pools_loaded(self):
        agent = DataAgent()
        state = agent.act()
        assert len(state.graph.nodes) == 5

    def test_custom_pools(self):
        agent = DataAgent()
        pools = [
            PoolData("A", 0.7, "US"),
            PoolData("B", 0.3, "DE"),
        ]
        state = agent.act(pools=pools)
        assert len(state.graph.nodes) == 2

    def test_normalizes_invalid_shares(self):
        agent = DataAgent()
        pools = [
            PoolData("A", 0.5, "US"),
            PoolData("B", 0.3, "DE"),
        ]
        state = agent.act(pools=pools)
        total = sum(
            state.graph.nodes[n]["hashpower_share"] for n in state.graph.nodes
        )
        assert total == pytest.approx(1.0)

    def test_empty_pools_raises(self):
        agent = DataAgent()
        with pytest.raises(ValueError, match="must not be empty"):
            agent.act(pools=[])

    def test_negative_share_raises(self):
        agent = DataAgent()
        pools = [
            PoolData("A", -0.5, "US"),
            PoolData("B", 0.5, "DE"),
        ]
        with pytest.raises(ValueError, match="negative"):
            agent.act(pools=pools)


# ---------- SimAgent tests ----------


class TestSimAgent:
    """Tests for SimAgent scenario dispatch."""

    @pytest.fixture
    def network_state(self):
        return DataAgent().act()

    def test_dispatches_51_attack(self, network_state):
        agent = SimAgent()
        result = agent.act(network_state, "51_attack", iterations=100)
        assert isinstance(result, SimResult)
        assert result.scenario == "51_attack"

    def test_dispatches_quantum_break(self, network_state):
        agent = SimAgent()
        result = agent.act(network_state, "quantum_break", iterations=100)
        assert isinstance(result, SimResult)
        assert result.scenario == "quantum_break"

    def test_dispatches_game_theory(self, network_state):
        agent = SimAgent()
        result = agent.act(network_state, "game_theory", iterations=100)
        assert isinstance(result, SimResult)
        assert result.scenario == "game_theory"

    def test_unknown_scenario_raises(self, network_state):
        agent = SimAgent()
        with pytest.raises(ValueError, match="Unknown scenario"):
            agent.act(network_state, "nonexistent")

    def test_kwargs_passed_through(self, network_state):
        agent = SimAgent()
        result = agent.act(
            network_state, "51_attack", attacker_hashpower=0.4, iterations=50
        )
        assert result.iterations == 50
        assert result.metadata["attacker_hashpower"] == pytest.approx(0.4)


# ---------- StrategyAgent tests ----------


class TestStrategyAgent:
    """Tests for StrategyAgent rule-based decision tree."""

    def _make_result(self, scenario, risk, metadata=None):
        return SimResult(
            scenario=scenario,
            risk_score=risk,
            mean=risk / 100.0,
            std_dev=0.1,
            iterations=100,
            metadata=metadata or {},
        )

    def test_51_low_risk_routine(self):
        agent = StrategyAgent()
        result = self._make_result("51_attack", 30)
        strategies = agent.act(result)
        assert len(strategies) >= 1
        assert all(isinstance(s, DefenseStrategy) for s in strategies)
        assert strategies[0].name == "Routine monitoring"

    def test_51_medium_risk_redistribution(self):
        agent = StrategyAgent()
        result = self._make_result("51_attack", 60)
        strategies = agent.act(result)
        names = [s.name for s in strategies]
        assert "Redistribute hashpower" in names
        assert "Geographic diversity alliance" in names

    def test_51_high_risk_emergency(self):
        agent = StrategyAgent()
        result = self._make_result("51_attack", 80)
        strategies = agent.act(result)
        names = [s.name for s in strategies]
        assert "Emergency difficulty adjustment" in names
        assert "Redistribute hashpower" in names

    def test_quantum_medium_risk(self):
        agent = StrategyAgent()
        result = self._make_result("quantum_break", 60)
        strategies = agent.act(result)
        names = [s.name for s in strategies]
        assert "Post-quantum cryptography migration" in names

    def test_quantum_high_risk(self):
        agent = StrategyAgent()
        result = self._make_result("quantum_break", 80)
        strategies = agent.act(result)
        names = [s.name for s in strategies]
        assert "Post-quantum cryptography migration" in names
        assert "Quantum-resistant signature fork" in names

    def test_quantum_interplanetary(self):
        agent = StrategyAgent()
        result = self._make_result(
            "quantum_break", 60, metadata={"include_interplanetary": True}
        )
        strategies = agent.act(result)
        names = [s.name for s in strategies]
        assert "Interplanetary latency mitigation" in names
        # Should reference Saylor
        ip_strat = [s for s in strategies if "Interplanetary" in s.name][0]
        assert any("Saylor" in r for r in ip_strat.references)

    def test_game_theory_high_defection(self):
        agent = StrategyAgent()
        result = self._make_result(
            "game_theory",
            60,
            metadata={"pool_incentives": {"Foundry": 0.8, "Others": 0.3}},
        )
        strategies = agent.act(result)
        names = [s.name for s in strategies]
        assert "Cooperative mining incentives" in names

    def test_lowery_reference_in_51_strategies(self):
        agent = StrategyAgent()
        result = self._make_result("51_attack", 60)
        strategies = agent.act(result)
        all_refs = [r for s in strategies for r in s.references]
        assert any("Lowery" in r for r in all_refs)

    def test_strategies_have_priorities(self):
        agent = StrategyAgent()
        result = self._make_result("51_attack", 80)
        strategies = agent.act(result)
        priorities = [s.priority for s in strategies]
        assert priorities == sorted(priorities)


# ---------- Full pipeline integration test ----------


class TestPipelineIntegration:
    """End-to-end test: DataAgent → SimAgent → StrategyAgent."""

    @pytest.mark.parametrize("scenario", ["51_attack", "quantum_break", "game_theory"])
    def test_full_pipeline(self, scenario):
        data_agent = DataAgent()
        sim_agent = SimAgent()
        strategy_agent = StrategyAgent()

        network_state = data_agent.act()
        assert isinstance(network_state, NetworkState)

        sim_result = sim_agent.act(network_state, scenario, iterations=100)
        assert isinstance(sim_result, SimResult)
        assert 0.0 <= sim_result.risk_score <= 100.0

        strategies = strategy_agent.act(sim_result)
        assert len(strategies) >= 1
        assert all(isinstance(s, DefenseStrategy) for s in strategies)
