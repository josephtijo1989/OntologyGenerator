from typing import Dict, Any
from app.graph.adapters.base import BaseGraphAdapter
from app.graph.adapters.neo4j_adapter import Neo4jAdapter
from app.graph.adapters.memgraph_adapter import MemgraphAdapter
from app.graph.adapters.age_adapter import ApacheAGEAdapter


class GraphAdapterFactory:
    @staticmethod
    def get_adapter(target_type: str, connection_params: Dict[str, Any]) -> BaseGraphAdapter:
        tt = (target_type or "NEO4J").upper()
        if "MEMGRAPH" in tt:
            return MemgraphAdapter(connection_params)
        elif "AGE" in tt or "POSTGRES" in tt:
            return ApacheAGEAdapter(connection_params)
        else:
            return Neo4jAdapter(connection_params)
