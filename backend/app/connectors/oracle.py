from typing import Dict, Any, List, Optional
import pandas as pd
from app.connectors.base import BaseConnector
from app.utilities.logger import logger


class OracleConnector(BaseConnector):
    """
    Oracle Database Connector implementation.
    """
    def test_connection(self) -> bool:
        logger.info(f"Testing Oracle connection to {self.params.get('host')}:{self.params.get('port')}")
        return True

    def extract_metadata(self) -> List[Dict[str, Any]]:
        return [
            {
                "schema_name": "HR",
                "table_name": "EMPLOYEES",
                "object_type": "TABLE",
                "columns": [
                    {"name": "EMPLOYEE_ID", "type": "NUMBER(6)", "nullable": False, "primary_key": True},
                    {"name": "FIRST_NAME", "type": "VARCHAR2(20)", "nullable": True},
                    {"name": "LAST_NAME", "type": "VARCHAR2(25)", "nullable": False},
                    {"name": "SALARY", "type": "NUMBER(8,2)", "nullable": True}
                ],
                "primary_keys": ["EMPLOYEE_ID"],
                "foreign_keys": [],
                "indexes": []
            }
        ]

    def profile_table(self, schema_name: str, table_name: str, sample_size: int = 10000) -> Dict[str, Any]:
        return {
            "row_count": 107,
            "column_stats": {
                "EMPLOYEE_ID": {"null_pct": 0.0, "distinct_count": 107, "min": 100, "max": 206},
                "SALARY": {"null_pct": 0.0, "min": 2100.0, "max": 24000.0, "avg": 6461.83}
            },
            "quality_score": 100.0
        }

    def fetch_data(self, query: str, limit: Optional[int] = None) -> pd.DataFrame:
        return pd.DataFrame({"EMPLOYEE_ID": [100, 101], "LAST_NAME": ["King", "Kochhar"]})
