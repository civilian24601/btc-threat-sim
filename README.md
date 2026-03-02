# AI-Driven Bitcoin Network Threat Simulator

AI agents that simulate threats to Bitcoin's PoW network — 51% attacks, quantum threats, and game-theoretic defection scenarios. Outputs risk scores, scenario narratives, and defense strategies. Built for security research, Bitcoin community tooling, and dual-use national security applications.

## Quick Start

```bash
pip install -e ".[dev]"
btc-threat-sim --scenario 51_attack
```

Run all three scenarios at once:

```bash
btc-threat-sim --all
```

## Architecture

The simulator follows a three-stage agentic pipeline:

```
 +-----------+      +----------+      +----------------+
 | DataAgent | ---> | SimAgent | ---> | StrategyAgent  |
 +-----------+      +----------+      +----------------+
       |                 |                    |
  Load pool data   Monte Carlo sim     Defense strategies
  Build network    Risk scoring        Ranked by priority
  graph (DiGraph)  Scenario metadata   Reference-backed
```

- **DataAgent** — Loads Bitcoin mining pool data and builds a network graph (NetworkX DiGraph) with hashpower distribution, geolocation tags, and fluctuation modeling.
- **SimAgent** — Dispatches to the appropriate simulation module based on the selected scenario and runs Monte Carlo iterations.
- **StrategyAgent** — Analyzes simulation results and produces ranked defense strategies using a rule-based decision tree.

## Scenarios

### 51% Attack (`51_attack`)

Monte Carlo simulation of double-spend attacks. Models attacker hashpower vs. honest network using binomial chain-race probabilities (Nakamoto consensus). The simulation:

- Uses **vectorized numpy binomial sampling** for efficient Monte Carlo runs
- Applies **geopolitical risk multipliers** per pool jurisdiction (e.g. CN pools receive a 1.2x multiplier)
- Supports `--attacker-hashpower auto` to automatically select the largest mining pool as the attacker
- Models configurable block depth (default 6 confirmations)

### Quantum Threat (`quantum_break`)

Models the impact of quantum computing on Bitcoin's SHA-256 mining and ECDSA key security. The simulation:

- Uses an **exponential distribution** for time-to-break estimation based on effective qubit count
- Parameterized by `--quantum-capability` (0.0 to 1.0) representing progress toward cryptographically-relevant quantum computers
- Optional `--interplanetary` flag adds a **Mars-Earth latency factor** (20-minute light-speed delay, 1.25x risk multiplier)
- 10-year planning horizon for break probability assessment

### Game Theory (`game_theory`)

Prisoner's dilemma modeling of mining pool cooperation vs. defection incentives:

- Computes **analytical Nash mixed-strategy equilibrium** from a parameterized payoff matrix
- Calculates **per-pool defection incentive scores** based on hashpower share and equilibrium probabilities
- Uses sigmoid risk mapping for score normalization
- Larger pools face proportionally higher incentives to defect

## Example Output

```
───────────────────── 51% Attack Simulation ──────────────────────

 +--------------------------+
 |   RISK SCORE: 5.3 / 100 |
 +--------------------------+

 Bitcoin Mining Pool Distribution
  Pool     Share  Hashpower  Country  Distribution
  Foundry  28.0%  168.0 EH/s  US     ######..............
  Others   25.0%  150.0 EH/s  MIXED  #####...............
  AntPool  22.0%  132.0 EH/s  CN     ####................
  F2Pool   15.0%   90.0 EH/s  CN     ###.................
  ViaBTC   10.0%   60.0 EH/s  CN     ##..................

 Simulation Statistics
  Iterations          1000
  Mean success rate   0.0530
  Std deviation       0.2240
  Attacker hashpower  28.0%
  Attacker pool       Foundry
  Block depth         6
  Geo risk multiplier 1.00

 Defense Recommendations:
  1. Routine monitoring
     Continue standard network monitoring and pool tracking.
```

## CLI Reference

```
btc-threat-sim [OPTIONS]

Options:
  --scenario {51_attack,quantum_break,game_theory}
                        Threat scenario to simulate
  --all                 Run all three scenarios sequentially
  --iterations N        Number of Monte Carlo iterations (default: 1000)
  --attacker-hashpower F
                        Attacker hashpower fraction 0.0-1.0, or "auto"
                        (default: auto, 51_attack only)
  --quantum-capability F
                        Quantum capability level 0.0-1.0 (default: 0.5)
  --interplanetary      Enable interplanetary latency factor
  --pools JSON          Custom pool data as JSON array
  --json                Output results as JSON instead of rich console
```

### Examples

```bash
# Simulate a 51% attack with 40% attacker hashpower
btc-threat-sim --scenario 51_attack --attacker-hashpower 0.4 --iterations 5000

# Quantum threat with interplanetary delay
btc-threat-sim --scenario quantum_break --quantum-capability 0.8 --interplanetary

# Game theory analysis with JSON output
btc-threat-sim --scenario game_theory --json

# Run all scenarios
btc-threat-sim --all

# Custom mining pool data
btc-threat-sim --scenario 51_attack --pools '[{"name":"PoolA","hashpower_share":0.6,"country":"US"},{"name":"PoolB","hashpower_share":0.4,"country":"DE"}]'
```

## National Security Angle

This project is informed by two complementary theses on Bitcoin's strategic relevance:

- **Lowery's "Softwar" thesis** — Frames proof-of-work as a projection of power in cyberspace, analogous to physical military capability. Bitcoin mining becomes a domain of national security competition.
- **Saylor's interplanetary resilience framing** — Positions Bitcoin as the only monetary protocol capable of operating across interplanetary latencies, making it foundational infrastructure for multi-planet civilization.

The simulator bridges these perspectives by modeling threats at the intersection of cryptographic security, geopolitical hashpower distribution, and physical constraints of deep-space communication.

## Dual-Use Potential

This tool is designed for **defensive security research** and **educational purposes**. Potential applications:

| Domain | Use Case |
|--------|----------|
| **Security Research** | Quantify risk of hashpower centralization, model attack costs |
| **Policy Analysis** | Evaluate geopolitical implications of mining pool jurisdiction |
| **Education** | Demonstrate Bitcoin consensus mechanics and failure modes |
| **National Defense** | Assess PoW network resilience as critical infrastructure |
| **Space Systems** | Model consensus protocol behavior under interplanetary latencies |

All simulations are purely mathematical models running on synthetic data. No actual Bitcoin network interaction occurs.

## Development

```bash
# Install with dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Run with verbose logging
python -m btc_threat_sim.cli --scenario 51_attack
```

### Project Structure

```
src/btc_threat_sim/
  models.py            Data models (PoolData, SimResult, etc.)
  data.py              Mining pool data and network graph builder
  cli.py               Command-line interface
  report.py            Rich console and JSON report formatting
  sims/
    fifty_one.py       51% attack Monte Carlo simulation
    quantum.py         Quantum threat simulation
    game_theory.py     Game theory / Nash equilibrium simulation
  agents/
    data_agent.py      DataAgent — data loading and validation
    sim_agent.py       SimAgent — simulation dispatch
    strategy_agent.py  StrategyAgent — defense recommendations
```

## License

MIT
