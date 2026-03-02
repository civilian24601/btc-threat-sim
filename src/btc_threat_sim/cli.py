"""Command-line interface for btc-threat-sim."""

import argparse
import json
import sys

from btc_threat_sim.agents.data_agent import DataAgent
from btc_threat_sim.agents.sim_agent import SimAgent
from btc_threat_sim.agents.strategy_agent import StrategyAgent
from btc_threat_sim.models import PoolData, ThreatReport
from btc_threat_sim.report import format_console_report, format_json_report

SCENARIOS = ["51_attack", "quantum_break", "game_theory"]

SCENARIO_NARRATIVES = {
    "51_attack": (
        "This simulation models the probability of a successful double-spend "
        "attack where an adversary controls a significant share of Bitcoin's "
        "total hashpower. Using a binomial chain-race model over {iterations} "
        "Monte Carlo iterations, the attacker's ability to build a longer "
        "chain than the honest network is evaluated. Geopolitical risk "
        "multipliers adjust the score based on the attacker's jurisdiction."
    ),
    "quantum_break": (
        "This simulation estimates the timeline for quantum computers to "
        "threaten Bitcoin's cryptographic foundations. Grover's algorithm "
        "effectively halves SHA-256's security (256-bit -> 128-bit equivalent). "
        "Using an exponential time-to-break model over {iterations} iterations, "
        "the probability of a cryptographically relevant break within the "
        "planning horizon is assessed."
    ),
    "game_theory": (
        "This simulation models the incentive landscape for mining pool "
        "cooperation vs. defection using a prisoner's dilemma framework. "
        "Nash equilibrium analysis reveals the stable mixed strategy, while "
        "per-pool incentive scores highlight which actors have the greatest "
        "motivation to deviate from cooperative mining over {iterations} "
        "simulated rounds."
    ),
}


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="btc-threat-sim",
        description="AI-Driven Bitcoin Network Threat Simulator",
    )
    parser.add_argument(
        "--scenario",
        choices=SCENARIOS,
        default="51_attack",
        help="Threat scenario to simulate (default: 51_attack)",
    )
    parser.add_argument(
        "--pools",
        type=str,
        default=None,
        help='JSON string for custom pool distribution, e.g. \'{"PoolA": {"share": 0.6, "country": "US"}}\'',
    )
    parser.add_argument(
        "--iterations",
        type=int,
        default=1000,
        help="Number of Monte Carlo iterations (default: 1000)",
    )
    parser.add_argument(
        "--attacker-hashpower",
        type=float,
        default=None,
        help="Attacker hashpower fraction 0.0-1.0 (51%% scenario only)",
    )
    parser.add_argument(
        "--quantum-capability",
        type=float,
        default=None,
        help="Quantum capability 0.0-1.0 (quantum scenario only)",
    )
    parser.add_argument(
        "--interplanetary",
        action="store_true",
        help="Enable Mars-Earth latency factor (quantum scenario)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="File path for JSON report output",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        dest="run_all",
        help="Run all three scenarios sequentially",
    )
    return parser


def _parse_pools(pools_json: str) -> list[PoolData]:
    """Parse a JSON string into a list of PoolData."""
    data = json.loads(pools_json)
    pools = []
    for name, info in data.items():
        pools.append(
            PoolData(
                name=name,
                hashpower_share=info["share"],
                country=info.get("country", "UNKNOWN"),
            )
        )
    return pools


def _build_sim_kwargs(args: argparse.Namespace, scenario: str) -> dict:
    """Build keyword arguments for SimAgent based on scenario and CLI args."""
    kwargs: dict = {"iterations": args.iterations}

    if scenario == "51_attack":
        if args.attacker_hashpower is not None:
            kwargs["attacker_hashpower"] = args.attacker_hashpower
        else:
            kwargs["attacker_hashpower"] = "auto"
    elif scenario == "quantum_break":
        if args.quantum_capability is not None:
            kwargs["quantum_capability"] = args.quantum_capability
        kwargs["include_interplanetary"] = args.interplanetary

    return kwargs


def _run_scenario(args: argparse.Namespace, scenario: str) -> ThreatReport:
    """Run a single scenario through the full pipeline."""
    data_agent = DataAgent()
    sim_agent = SimAgent()
    strategy_agent = StrategyAgent()

    # Data
    pools = None
    if args.pools:
        pools = _parse_pools(args.pools)
    network_state = data_agent.act(pools=pools)

    # Simulate
    kwargs = _build_sim_kwargs(args, scenario)
    sim_result = sim_agent.act(network_state, scenario, **kwargs)

    # Strategy
    strategies = strategy_agent.act(sim_result)

    # Build narrative
    narrative = SCENARIO_NARRATIVES.get(scenario, "").format(
        iterations=sim_result.iterations
    )

    report = ThreatReport(
        scenario=scenario,
        sim_result=sim_result,
        strategies=strategies,
        narrative=narrative,
    )

    # Display
    format_console_report(report, network_state)

    return report


def main(argv: list[str] | None = None) -> None:
    """Entry point for the btc-threat-sim CLI."""
    parser = _build_parser()
    args = parser.parse_args(argv)

    scenarios = SCENARIOS if args.run_all else [args.scenario]
    all_reports = []

    for scenario in scenarios:
        try:
            report = _run_scenario(args, scenario)
            all_reports.append(report)
        except Exception as e:
            print(f"Error running {scenario}: {e}", file=sys.stderr)
            sys.exit(1)

    # JSON output
    if args.output:
        json_data = [format_json_report(r) for r in all_reports]
        # Unwrap single-scenario results
        if len(json_data) == 1:
            json_data = json_data[0]
        with open(args.output, "w") as f:
            json.dump(json_data, f, indent=2, default=str)
        print(f"Report written to {args.output}")
