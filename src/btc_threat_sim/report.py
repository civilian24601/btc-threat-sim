"""Report formatting and output."""

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from btc_threat_sim.models import NetworkState, ThreatReport

SCENARIO_LABELS = {
    "51_attack": "51% Attack Simulation",
    "quantum_break": "Quantum Threat Simulation",
    "game_theory": "Game Theory Defection Analysis",
}


def _risk_color(score: float) -> str:
    if score < 30:
        return "green"
    elif score < 60:
        return "yellow"
    return "red"


def _bar(fraction: float, width: int = 20) -> str:
    filled = int(round(fraction * width))
    return "#" * filled + "." * (width - filled)


def format_console_report(threat_report: ThreatReport, network_state: NetworkState | None = None) -> None:
    """Print a Rich-formatted threat report to the console."""
    console = Console(force_terminal=True)
    sim = threat_report.sim_result
    label = SCENARIO_LABELS.get(sim.scenario, sim.scenario)

    # Header
    console.print()
    console.rule(f"[bold]{label}[/bold]")
    console.print()

    # Risk score
    color = _risk_color(sim.risk_score)
    risk_text = Text(f"  RISK SCORE: {sim.risk_score:.1f} / 100  ", style=f"bold white on {color}")
    console.print(Panel(risk_text, expand=False))
    console.print()

    # Network state summary
    if network_state is not None:
        print_network_graph(network_state, console)
        console.print()

    # Simulation statistics
    stats_table = Table(title="Simulation Statistics", show_header=False, box=None, padding=(0, 2))
    stats_table.add_column("Metric", style="bold")
    stats_table.add_column("Value")
    stats_table.add_row("Iterations", str(sim.iterations))
    stats_table.add_row("Mean success rate", f"{sim.mean:.4f}")
    stats_table.add_row("Std deviation", f"{sim.std_dev:.4f}")

    # Scenario-specific metadata
    meta = sim.metadata
    if sim.scenario == "51_attack":
        stats_table.add_row("Attacker hashpower", f"{meta.get('attacker_hashpower', 0):.1%}")
        stats_table.add_row("Attacker pool", str(meta.get("attacker_name", "unknown")))
        stats_table.add_row("Block depth", str(meta.get("block_depth", 6)))
        stats_table.add_row("Geo risk multiplier", f"{meta.get('geo_multiplier', 1.0):.2f}")
    elif sim.scenario == "quantum_break":
        stats_table.add_row("Quantum capability", f"{meta.get('quantum_capability', 0):.1%}")
        ttb = meta.get("time_to_break_mean", float("inf"))
        stats_table.add_row("Mean time to break", f"{ttb:.2f} years" if ttb < 1e10 else "N/A")
        stats_table.add_row("Interplanetary mode", str(meta.get("include_interplanetary", False)))
        stats_table.add_row("Latency factor", f"{meta.get('latency_factor', 1.0):.2f}")
    elif sim.scenario == "game_theory":
        stats_table.add_row("Nash P(cooperate)", f"{meta.get('nash_p_cooperate', 0):.4f}")
        stats_table.add_row("Nash expected payoff", f"{meta.get('nash_expected_payoff', 0):.4f}")

    console.print(stats_table)
    console.print()

    # Defense strategies
    strategies = threat_report.strategies
    if strategies:
        console.print("[bold]Defense Recommendations:[/bold]")
        for i, s in enumerate(strategies, 1):
            console.print(f"  {i}. [bold]{s.name}[/bold]")
            console.print(f"     {s.description}")
            if s.references:
                for ref in s.references:
                    console.print(f"     [dim]Ref: {ref}[/dim]")
        console.print()

    # Narrative
    if threat_report.narrative:
        console.print(Panel(threat_report.narrative, title="Analysis", border_style="dim"))
        console.print()


def format_json_report(threat_report: ThreatReport) -> dict:
    """Convert a ThreatReport to a JSON-serializable dict."""
    result = {
        "scenario": threat_report.scenario,
        "risk_score": threat_report.sim_result.risk_score,
        "simulation": {
            "mean": threat_report.sim_result.mean,
            "std_dev": threat_report.sim_result.std_dev,
            "iterations": threat_report.sim_result.iterations,
            "metadata": threat_report.sim_result.metadata,
        },
        "strategies": [
            {
                "name": s.name,
                "description": s.description,
                "priority": s.priority,
                "references": s.references,
            }
            for s in threat_report.strategies
        ],
        "narrative": threat_report.narrative,
    }
    return result


def print_network_graph(network_state: NetworkState, console: Console | None = None) -> None:
    """Print a text representation of the network topology."""
    if console is None:
        console = Console(force_terminal=True)

    table = Table(title="Bitcoin Mining Pool Distribution")
    table.add_column("Pool", style="bold")
    table.add_column("Share", justify="right")
    table.add_column("Hashpower", justify="right")
    table.add_column("Country")
    table.add_column("Distribution")

    graph = network_state.graph
    for node in sorted(graph.nodes, key=lambda n: graph.nodes[n]["hashpower_share"], reverse=True):
        attrs = graph.nodes[node]
        share = attrs["hashpower_share"]
        absolute = attrs["hashpower_absolute"]

        # Format hashpower in EH/s
        eh_s = absolute / 1e18
        bar = _bar(share)

        table.add_row(
            node,
            f"{share:.1%}",
            f"{eh_s:.1f} EH/s",
            attrs["country"],
            bar,
        )

    console.print(table)
