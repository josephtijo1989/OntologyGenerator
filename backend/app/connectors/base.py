from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import pandas as pd


class BaseConnector(ABC):
    """
    Abstract Base Connector implementing Strategy pattern for source databases.
    All source database drivers must inherit from this class and implement its abstract interface.
    """
    def __init__(self, connection_params: Dict[str, Any]):
        self.params = connection_params

    @abstractmethod
    def test_connection(self) -> bool:
        """Tests validity of connection parameters."""
        pass

    @abstractmethod
    def extract_metadata(self) -> List[Dict[str, Any]]:
        """
        Discovers and extracts metadata including tables, columns, data types,
        nullability, primary keys, foreign keys, and indexes.
        """
        pass

    @abstractmethod
    def profile_table(self, schema_name: str, table_name: str, columns: Optional[List[Dict[str, Any]]] = None, sample_size: int = 10000) -> Dict[str, Any]:
        """Profiles a specific table/view returning row counts, column metrics, null percentages, and min/max/avg values."""
        pass

    @abstractmethod
    def fetch_data(self, query: str, limit: Optional[int] = None) -> pd.DataFrame:
        """Executes query and returns Pandas DataFrame."""
        pass
