"""Tests for the FastAPI backend wrapper."""

import pytest
from fastapi.testclient import TestClient

from btc_threat_sim.api import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# GET /api/scenarios
# ---------------------------------------------------------------------------


class TestGetScenarios:
    def test_returns_three_scenarios(self):
        resp = client.get("/api/scenarios")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 3

    def test_scenario_ids(self):
        resp = client.get("/api/scenarios")
        ids = [s["id"] for s in resp.json()]
        assert ids == ["51_attack", "quantum_break", "game_theory"]

    def test_scenario_has_required_fields(self):
        resp = client.get("/api/scenarios")
        for scenario in resp.json():
            assert "id" in scenario
            assert "name" in scenario
            assert "description" in scenario
            assert "parameters" in scenario
            assert isinstance(scenario["parameters"], dict)

    def test_51_attack_parameters(self):
        resp = client.get("/api/scenarios")
        attack = [s for s in resp.json() if s["id"] == "51_attack"][0]
        assert "iterations" in attack["parameters"]
        assert "attacker_hashpower" in attack["parameters"]

    def test_quantum_parameters(self):
        resp = client.get("/api/scenarios")
        quantum = [s for s in resp.json() if s["id"] == "quantum_break"][0]
        assert "quantum_capability" in quantum["parameters"]
        assert "interplanetary" in quantum["parameters"]


# ---------------------------------------------------------------------------
# GET /api/network
# ---------------------------------------------------------------------------


class TestGetNetwork:
    def test_returns_pools(self):
        resp = client.get("/api/network")
        assert resp.status_code == 200
        data = resp.json()
        assert "pools" in data
        assert len(data["pools"]) == 5

    def test_pool_has_required_fields(self):
        resp = client.get("/api/network")
        for pool in resp.json()["pools"]:
            assert "name" in pool
            assert "hashpower_share" in pool
            assert "hashpower_eh" in pool
            assert "country" in pool

    def test_shares_sum_to_one(self):
        resp = client.get("/api/network")
        shares = [p["hashpower_share"] for p in resp.json()["pools"]]
        assert abs(sum(shares) - 1.0) < 1e-6

    def test_has_global_hashrate(self):
        resp = client.get("/api/network")
        data = resp.json()
        assert "global_hashrate" in data
        assert data["global_hashrate"] == 600e18
        assert data["global_hashrate_eh"] == 600.0

    def test_has_timestamp(self):
        resp = client.get("/api/network")
        assert "timestamp" in resp.json()

    def test_has_adjacency(self):
        resp = client.get("/api/network")
        assert "adjacency" in resp.json()
        assert isinstance(resp.json()["adjacency"], dict)


# ---------------------------------------------------------------------------
# POST /api/simulate
# ---------------------------------------------------------------------------


class TestPostSimulate:
    def test_51_attack_default(self):
        resp = client.post(
            "/api/simulate",
            json={"scenario": "51_attack", "iterations": 100},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "risk_score" in data
        assert "simulation" in data
        assert "strategies" in data
        assert "narrative" in data
        assert "network" in data
        assert data["scenario"] == "51_attack"
        assert 0 <= data["risk_score"] <= 100

    def test_quantum_break(self):
        resp = client.post(
            "/api/simulate",
            json={
                "scenario": "quantum_break",
                "iterations": 100,
                "quantum_capability": 0.8,
                "interplanetary": True,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["scenario"] == "quantum_break"
        assert data["simulation"]["metadata"]["include_interplanetary"] is True

    def test_game_theory(self):
        resp = client.post(
            "/api/simulate",
            json={"scenario": "game_theory", "iterations": 100},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["scenario"] == "game_theory"
        assert "nash_p_cooperate" in data["simulation"]["metadata"]

    def test_invalid_scenario_returns_422(self):
        resp = client.post(
            "/api/simulate",
            json={"scenario": "invalid_thing", "iterations": 100},
        )
        assert resp.status_code == 422

    def test_negative_iterations_returns_422(self):
        resp = client.post(
            "/api/simulate",
            json={"scenario": "51_attack", "iterations": -1},
        )
        assert resp.status_code == 422

    def test_custom_pools(self):
        resp = client.post(
            "/api/simulate",
            json={
                "scenario": "51_attack",
                "iterations": 100,
                "pools": [
                    {"name": "PoolA", "hashpower_share": 0.6, "country": "US"},
                    {"name": "PoolB", "hashpower_share": 0.4, "country": "DE"},
                ],
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        pool_names = [p["name"] for p in data["network"]["pools"]]
        assert "PoolA" in pool_names
        assert "PoolB" in pool_names

    def test_attacker_hashpower_param(self):
        resp = client.post(
            "/api/simulate",
            json={
                "scenario": "51_attack",
                "iterations": 100,
                "attacker_hashpower": 0.4,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["simulation"]["metadata"]["attacker_hashpower"] == pytest.approx(0.4)

    def test_network_included_in_response(self):
        resp = client.post(
            "/api/simulate",
            json={"scenario": "51_attack", "iterations": 100},
        )
        assert resp.status_code == 200
        network = resp.json()["network"]
        assert "pools" in network
        assert "global_hashrate" in network
        assert "timestamp" in network

    def test_strategies_have_structure(self):
        resp = client.post(
            "/api/simulate",
            json={"scenario": "quantum_break", "iterations": 100, "quantum_capability": 0.9},
        )
        assert resp.status_code == 200
        strategies = resp.json()["strategies"]
        assert len(strategies) > 0
        for s in strategies:
            assert "name" in s
            assert "description" in s
            assert "priority" in s
            assert "references" in s
