"""Smoke tests for the CLI."""

import json
import os
import tempfile

import pytest

from btc_threat_sim.cli import main


class TestCLISmoke:
    """Smoke tests — verify main() runs without error for each scenario."""

    def test_51_attack_default(self):
        main(["--scenario", "51_attack", "--iterations", "100"])

    def test_quantum_break_default(self):
        main(["--scenario", "quantum_break", "--iterations", "100"])

    def test_game_theory_default(self):
        main(["--scenario", "game_theory", "--iterations", "100"])

    def test_all_scenarios(self):
        main(["--all", "--iterations", "100"])

    def test_json_output(self):
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
            path = f.name
        try:
            main(["--scenario", "51_attack", "--iterations", "100", "--output", path])
            with open(path) as f:
                data = json.load(f)
            assert "risk_score" in data
            assert "scenario" in data
        finally:
            os.unlink(path)

    def test_json_output_all(self):
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
            path = f.name
        try:
            main(["--all", "--iterations", "100", "--output", path])
            with open(path) as f:
                data = json.load(f)
            assert isinstance(data, list)
            assert len(data) == 3
        finally:
            os.unlink(path)

    def test_interplanetary_flag(self):
        main(["--scenario", "quantum_break", "--interplanetary", "--iterations", "100"])

    def test_custom_attacker_hashpower(self):
        main(["--scenario", "51_attack", "--attacker-hashpower", "0.4", "--iterations", "100"])

    def test_custom_quantum_capability(self):
        main(["--scenario", "quantum_break", "--quantum-capability", "0.8", "--iterations", "100"])


class TestCLIEdgeCases:
    """Edge case tests for CLI input validation."""

    def test_negative_iterations_exits(self):
        with pytest.raises(SystemExit):
            main(["--scenario", "51_attack", "--iterations", "-1"])

    def test_invalid_json_pools_exits(self):
        with pytest.raises(SystemExit):
            main(["--scenario", "51_attack", "--pools", "not-valid-json"])

    def test_custom_pools_json(self):
        pools_json = '{"PoolX": {"share": 0.6, "country": "US"}, "PoolY": {"share": 0.4, "country": "DE"}}'
        main(["--scenario", "51_attack", "--pools", pools_json, "--iterations", "50"])

    def test_zero_attacker_hashpower(self):
        main(["--scenario", "51_attack", "--attacker-hashpower", "0.0", "--iterations", "50"])

    def test_full_attacker_hashpower(self):
        main(["--scenario", "51_attack", "--attacker-hashpower", "1.0", "--iterations", "50"])

    def test_extreme_iterations(self):
        """10000 iterations should complete without error."""
        main(["--scenario", "51_attack", "--iterations", "10000"])
