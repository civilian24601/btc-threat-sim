# AI-Driven Bitcoin Network Threat Simulator

AI agents that simulate threats to Bitcoin's PoW network — 51% attacks, quantum threats, and game-theoretic defection scenarios. Outputs risk scores, scenario narratives, and defense strategies. Built for security research, Bitcoin community tooling, and dual-use national security applications.

## Quick Start

```bash
pip install -e .
btc-threat-sim --scenario 51_attack
```

## Architecture

The simulator follows a three-stage agentic pipeline:

```
DataAgent → SimAgent → StrategyAgent
```

- **DataAgent** — Loads Bitcoin mining pool data and builds a network graph (NetworkX DiGraph) with hashpower distribution, geolocation tags, and fluctuation modeling.
- **SimAgent** — Dispatches to the appropriate simulation module based on the selected scenario and runs Monte Carlo iterations.
- **StrategyAgent** — Analyzes simulation results and produces ranked defense strategies using a rule-based decision tree.

## Scenarios

### 51% Attack (`51_attack`)
Monte Carlo simulation of double-spend attacks. Models attacker hashpower vs. honest network using binomial chain-race probabilities. Includes geopolitical risk multipliers per pool jurisdiction.

### Quantum Threat (`quantum_break`)
Models Grover's algorithm impact on Bitcoin's SHA-256 mining and ECDSA key security. Parameterized by quantum capability level with optional interplanetary latency factors (Mars-Earth settlement delay).

### Game Theory (`game_theory`)
Prisoner's dilemma modeling of mining pool cooperation vs. defection incentives. Computes Nash equilibria and per-pool attack incentive scores based on hashpower share and payoff structure.

## National Security Angle

This project is informed by two complementary theses on Bitcoin's strategic relevance:

- **Lowery's "Softwar" thesis** — Frames proof-of-work as a projection of power in cyberspace, analogous to physical military capability. Bitcoin mining becomes a domain of national security competition.
- **Saylor's interplanetary resilience framing** — Positions Bitcoin as the only monetary protocol capable of operating across interplanetary latencies, making it foundational infrastructure for multi-planet civilization.

The simulator bridges these perspectives by modeling threats at the intersection of cryptographic security, geopolitical hashpower distribution, and physical constraints of deep-space communication.
