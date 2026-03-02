"""StrategyAgent — generates defense strategies from simulation results."""

from btc_threat_sim.models import DefenseStrategy, SimResult

# Reference hooks
REF_LOWERY = "Lowery, J. 'Softwar: A Novel Theory on Power Projection and the National Strategic Significance of Bitcoin'"
REF_SAYLOR = "Saylor, M. Interplanetary resilience framing for multi-planet monetary infrastructure"


class StrategyAgent:
    """Agent that produces ranked defense strategies from simulation results."""

    def act(self, sim_result: SimResult) -> list[DefenseStrategy]:
        """Generate defense strategies based on simulation outcome.

        Args:
            sim_result: The completed simulation result.

        Returns:
            Ordered list of DefenseStrategy recommendations.
        """
        scenario = sim_result.scenario
        risk = sim_result.risk_score

        if scenario == "51_attack":
            return self._strategies_51(risk)
        elif scenario == "quantum_break":
            return self._strategies_quantum(risk, sim_result.metadata)
        elif scenario == "game_theory":
            return self._strategies_game_theory(risk, sim_result.metadata)
        else:
            return [
                DefenseStrategy(
                    name="General monitoring",
                    description="Monitor network health indicators and alert on anomalies.",
                    priority=1,
                )
            ]

    def _strategies_51(self, risk: float) -> list[DefenseStrategy]:
        strategies: list[DefenseStrategy] = []

        if risk > 50:
            strategies.append(
                DefenseStrategy(
                    name="Redistribute hashpower",
                    description="Redistribute hashpower via mining incentive programs",
                    priority=1,
                    references=[REF_LOWERY],
                )
            )
            strategies.append(
                DefenseStrategy(
                    name="Geographic diversity alliance",
                    description="Establish US Hash Force alliance for geographic diversity",
                    priority=2,
                    references=[REF_LOWERY],
                )
            )

        if risk > 70:
            strategies.append(
                DefenseStrategy(
                    name="Emergency difficulty adjustment",
                    description="Emergency difficulty adjustment protocol",
                    priority=3,
                )
            )

        if not strategies:
            strategies.append(
                DefenseStrategy(
                    name="Routine monitoring",
                    description="Continue routine hashpower distribution monitoring.",
                    priority=1,
                )
            )

        return strategies

    def _strategies_quantum(
        self, risk: float, metadata: dict
    ) -> list[DefenseStrategy]:
        strategies: list[DefenseStrategy] = []

        if risk > 50:
            strategies.append(
                DefenseStrategy(
                    name="Post-quantum cryptography migration",
                    description="Accelerate post-quantum cryptography migration (lattice-based)",
                    priority=1,
                )
            )

        if risk > 70:
            strategies.append(
                DefenseStrategy(
                    name="Quantum-resistant signature fork",
                    description="Implement quantum-resistant signature scheme fork",
                    priority=2,
                )
            )

        if metadata.get("include_interplanetary"):
            strategies.append(
                DefenseStrategy(
                    name="Interplanetary latency mitigation",
                    description="Deploy sidechain latency mitigation for interplanetary settlement",
                    priority=3,
                    references=[REF_SAYLOR],
                )
            )

        if not strategies:
            strategies.append(
                DefenseStrategy(
                    name="Cryptographic readiness monitoring",
                    description="Monitor quantum computing advances and maintain migration readiness.",
                    priority=1,
                )
            )

        return strategies

    def _strategies_game_theory(
        self, risk: float, metadata: dict
    ) -> list[DefenseStrategy]:
        strategies: list[DefenseStrategy] = []

        # Check for high defection incentive among any pool
        pool_incentives = metadata.get("pool_incentives", {})
        high_defection = any(v > 0.5 for v in pool_incentives.values())

        if risk > 50 or high_defection:
            strategies.append(
                DefenseStrategy(
                    name="Cooperative mining incentives",
                    description="Implement cooperative mining incentive structures",
                    priority=1,
                    references=[REF_LOWERY],
                )
            )

        if risk > 70:
            strategies.append(
                DefenseStrategy(
                    name="Defection penalty mechanism",
                    description="Design protocol-level penalties for detected defection behaviour.",
                    priority=2,
                )
            )

        if not strategies:
            strategies.append(
                DefenseStrategy(
                    name="Incentive monitoring",
                    description="Monitor pool cooperation metrics and defection signals.",
                    priority=1,
                )
            )

        return strategies
