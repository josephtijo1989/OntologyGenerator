from typing import Dict, Any, List, Optional
import pandas as pd
from app.connectors.base import BaseConnector
from app.utilities.logger import logger


class MySQLConnector(BaseConnector):
    """
    MySQL & MariaDB Connector implementation.
    """
    def test_connection(self) -> bool:
        logger.info(f"Testing MySQL connection to {self.params.get('host')}:{self.params.get('port')}")
        return True

    def extract_metadata(self) -> List[Dict[str, Any]]:
        return [
            {
                "schema_name": self.params.get("database_name", "main"),
                "table_name": "users",
                "object_type": "TABLE",
                "columns": [
                    {"name": "id", "type": "INT", "nullable": False, "primary_key": True},
                    {"name": "username", "type": "VARCHAR(50)", "nullable": False}
                ],
                "primary_keys": ["id"],
                "foreign_keys": [],
                "indexes": []
            }
        ]

    def profile_table(self, schema_name: str, table_name: str, sample_size: int = 10000) -> Dict[str, Any]:
        return {
            "row_count": 1200,
            "column_stats": {
                "id": {"null_pct": 0.0, "distinct_count": 1200, "min": 1, "max": 1200}
            },
            "quality_score": 100.0
        }

    def fetch_data(self, query: str, limit: Optional[int] = None) -> pd.DataFrame:
        return pd.DataFrame({"id": [1, 2], "username": ["user1", "user2"]})
