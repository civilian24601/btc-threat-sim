"""DataAgent — loads pool data and builds network graph."""

from btc_threat_sim.data import DEFAULT_POOLS, build_network_graph
from btc_threat_sim.models import NetworkState, PoolData


class DataAgent:
    """Agent that loads and validates Bitcoin mining pool data."""

    def act(self, pools: list[PoolData] | None = None) -> NetworkState:
        """Load pool data, validate, and build the network graph.

        Args:
            pools: Custom pool list, or None to use defaults.

        Returns:
            A validated NetworkState with the mining network graph.

        Raises:
            ValueError: If pool data is empty or shares are invalid.
        """
        if pools is not None:
            if len(pools) == 0:
                raise ValueError("Pool list must not be empty.")

            for p in pools:
                if p.hashpower_share < 0:
                    raise ValueError(
                        f"Pool '{p.name}' has negative hashpower share."
                    )

            total = sum(p.hashpower_share for p in pools)
            if abs(total - 1.0) > 0.01:
                # Normalize shares to sum to 1.0
                pools = [
                    PoolData(
                        name=p.name,
                        hashpower_share=p.hashpower_share / total,
                        country=p.country,
                    )
                    for p in pools
                ]

        return build_network_graph(pools=pools)
