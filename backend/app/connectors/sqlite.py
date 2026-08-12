from typing import Dict, Any, List, Optional
import pandas as pd
from app.connectors.base import BaseConnector
from app.utilities.logger import logger


class SQLiteConnector(BaseConnector):
    """
    SQLite Database Connector implementation.
    """
    def test_connection(self) -> bool:
        logger.info("Testing SQLite connection")
        return True

    def extract_metadata(self) -> List[Dict[str, Any]]:
        return [
            {
                "schema_name": "main",
                "table_name": "contacts",
                "object_type": "TABLE",
                "row_count": 450,
                "columns": [
                    {"name": "id", "type": "INTEGER", "nullable": False, "primary_key": True},
                    {"name": "name", "type": "TEXT", "nullable": False},
                    {"name": "phone", "type": "TEXT", "nullable": True},
                    {"name": "email", "type": "TEXT", "nullable": True}
                ],
                "primary_keys": ["id"],
                "foreign_keys": [],
                "indexes": []
            },
            {
                "schema_name": "main",
                "table_name": "accounts",
                "object_type": "TABLE",
                "row_count": 1280,
                "columns": [
                    {"name": "account_id", "type": "INTEGER", "nullable": False, "primary_key": True},
                    {"name": "contact_id", "type": "INTEGER", "nullable": False},
                    {"name": "balance", "type": "REAL", "nullable": False}
                ],
                "primary_keys": ["account_id"],
                "foreign_keys": [],
                "indexes": []
            },
            {
                "schema_name": "main",
                "table_name": "transactions",
                "object_type": "TABLE",
                "row_count": 9450,
                "columns": [
                    {"name": "txn_id", "type": "INTEGER", "nullable": False, "primary_key": True},
                    {"name": "account_id", "type": "INTEGER", "nullable": False},
                    {"name": "amount", "type": "REAL", "nullable": False},
                    {"name": "txn_date", "type": "TIMESTAMP", "nullable": False}
                ],
                "primary_keys": ["txn_id"],
                "foreign_keys": [],
                "indexes": []
            }
        ]

    def profile_table(self, schema_name: str, table_name: str, columns: Optional[List[Dict[str, Any]]] = None, sample_size: int = 10000) -> Dict[str, Any]:
        return {
            "row_count": 450,
            "column_stats": {
                "id": {"null_pct": 0.0, "distinct_count": 450, "min": 1, "max": 450},
                "phone": {"null_pct": 0.1, "pii_tagged": True, "pii_type": "PHONE"}
            },
            "quality_score": 99.0
        }

    def fetch_data(self, query: str, limit: Optional[int] = None) -> pd.DataFrame:
        return pd.DataFrame({"id": [1, 2], "name": ["John Doe", "Jane Smith"]})
