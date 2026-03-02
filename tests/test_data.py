"""Tests for data layer and network graph modeling."""

import numpy as np
import pytest

from btc_threat_sim.data import DEFAULT_POOLS, GLOBAL_HASHRATE, build_network_graph
from btc_threat_sim.models import NetworkState


class TestDefaultPools:
    """Tests for hardcoded pool data."""

    def test_pool_shares_sum_to_one(self):
        total = sum(p.hashpower_share for p in DEFAULT_POOLS)
        assert total == pytest.approx(1.0)

    def test_pool_count(self):
        assert len(DEFAULT_POOLS) == 5


class TestBuildNetworkGraph:
    """Tests for the network graph builder."""

    def test_returns_network_state(self):
        state = build_network_graph()
        assert isinstance(state, NetworkState)

    def test_graph_node_count_matches_pool_count(self):
        state = build_network_graph()
        assert len(state.graph.nodes) == len(DEFAULT_POOLS)

    def test_all_nodes_have_required_attributes(self):
        state = build_network_graph()
        for node in state.graph.nodes:
            attrs = state.graph.nodes[node]
            assert "hashpower_share" in attrs
            assert "hashpower_absolute" in attrs
            assert "country" in attrs

    def test_shares_sum_to_one_without_fluctuation(self):
        state = build_network_graph(fluctuate=False)
        total = sum(state.graph.nodes[n]["hashpower_share"] for n in state.graph.nodes)
        assert total == pytest.approx(1.0)

    def test_global_hashrate_stored(self):
        state = build_network_graph()
        assert state.global_hashrate == GLOBAL_HASHRATE

    def test_hashpower_absolute_matches_share(self):
        state = build_network_graph(fluctuate=False)
        for node in state.graph.nodes:
            attrs = state.graph.nodes[node]
            expected = attrs["hashpower_share"] * GLOBAL_HASHRATE
            assert attrs["hashpower_absolute"] == pytest.approx(expected)

    def test_timestamp_present(self):
        state = build_network_graph()
        assert state.timestamp is not None
        assert len(state.timestamp) > 0


class TestHashpowerFluctuation:
    """Tests for ±5% hashpower randomization."""

    def test_fluctuation_stays_within_bounds(self):
        """Each pool's share should not deviate more than ~10% from its
        base value after fluctuation + renormalization."""
        rng = np.random.default_rng(42)
        base_state = build_network_graph(fluctuate=False)
        fluct_state = build_network_graph(fluctuate=True, rng=rng)

        for node in base_state.graph.nodes:
            base_share = base_state.graph.nodes[node]["hashpower_share"]
            fluct_share = fluct_state.graph.nodes[node]["hashpower_share"]
            # After ±5% fluctuation and renormalization, deviation should be bounded.
            # Worst case: one pool gets +5% while others get -5%, so ratio can shift
            # by roughly ±10% of original. Use a generous 15% tolerance.
            assert fluct_share == pytest.approx(base_share, rel=0.15)

    def test_fluctuated_shares_sum_to_one(self):
        rng = np.random.default_rng(99)
        state = build_network_graph(fluctuate=True, rng=rng)
        total = sum(state.graph.nodes[n]["hashpower_share"] for n in state.graph.nodes)
        assert total == pytest.approx(1.0)

    def test_fluctuation_is_random(self):
        """Two calls with different RNGs should produce different results."""
        state_a = build_network_graph(fluctuate=True, rng=np.random.default_rng(1))
        state_b = build_network_graph(fluctuate=True, rng=np.random.default_rng(2))

        shares_a = [state_a.graph.nodes[n]["hashpower_share"] for n in state_a.graph.nodes]
        shares_b = [state_b.graph.nodes[n]["hashpower_share"] for n in state_b.graph.nodes]
        assert shares_a != shares_b

    def test_no_fluctuation_is_deterministic(self):
        state_a = build_network_graph(fluctuate=False)
        state_b = build_network_graph(fluctuate=False)

        for node in state_a.graph.nodes:
            assert (
                state_a.graph.nodes[node]["hashpower_share"]
                == state_b.graph.nodes[node]["hashpower_share"]
            )


class TestCustomPools:
    """Tests for passing custom pool data."""

    def test_custom_pools(self):
        from btc_threat_sim.models import PoolData

        custom = [
            PoolData(name="PoolA", hashpower_share=0.6, country="US"),
            PoolData(name="PoolB", hashpower_share=0.4, country="DE"),
        ]
        state = build_network_graph(pools=custom)
        assert len(state.graph.nodes) == 2
        assert state.graph.nodes["PoolA"]["hashpower_share"] == pytest.approx(0.6)
        assert state.graph.nodes["PoolB"]["country"] == "DE"
