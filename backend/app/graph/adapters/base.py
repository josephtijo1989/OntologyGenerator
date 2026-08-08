from abc import ABC, abstractmethod
from typing import Dict, Any, List


class BaseGraphAdapter(ABC):
    """
    Abstract Target Graph Database Adapter interface.
    """
    def __init__(self, connection_params: Dict[str, Any]):
        self.params = connection_params

    @abstractmethod
    def test_connection(self) -> bool:
        pass

    @abstractmethod
    def create_nodes(self, nodes: List[Dict[str, Any]]) -> bool:
        pass

    @abstractmethod
    def create_relationships(self, relationships: List[Dict[str, Any]]) -> bool:
        pass

    @abstractmethod
    def execute_cypher(self, query: str, parameters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        pass
