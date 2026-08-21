import sqlite3
from typing import Dict, Any, List, Optional
import pandas as pd
from app.connectors.base import BaseConnector
from app.utilities.logger import logger


class SQLiteConnector(BaseConnector):
    """
    SQLite Database Connector implementation.
    Extracts metadata from real target SQLite database file.
    """
    def _get_db_path(self) -> str:
        return self.params.get("database_name") or self.params.get("database") or self.params.get("host") or ":memory:"

    def test_connection(self) -> bool:
        db_path = self._get_db_path()
        logger.info(f"Testing SQLite connection to {db_path}")
        try:
            conn = sqlite3.connect(db_path)
            conn.close()
            return True
        except Exception as e:
            logger.error(f"SQLite connection test failed: {e}")
            return False

    def extract_metadata(self) -> List[Dict[str, Any]]:
        db_path = self._get_db_path()
        logger.info(f"Extracting SQLite metadata from {db_path}")
        catalogs = []
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
            tables = [row[0] for row in cursor.fetchall()]

            for tbl in tables:
                cursor.execute(f"PRAGMA table_info('{tbl}')")
                col_rows = cursor.fetchall()
                cols = []
                pks = []
                for cid, cname, ctype, notnull, dflt_value, pk in col_rows:
                    is_pk = bool(pk)
                    cols.append({
                        "name": cname,
                        "type": str(ctype).upper() or "TEXT",
                        "nullable": not bool(notnull),
                        "primary_key": is_pk
                    })
                    if is_pk:
                        pks.append(cname)

                cursor.execute(f"SELECT COUNT(1) FROM '{tbl}'")
                rc = cursor.fetchone()[0] or 0

                catalogs.append({
                    "schema_name": "main",
                    "table_name": tbl,
                    "object_type": "TABLE",
                    "row_count": rc,
                    "columns": cols,
                    "primary_keys": pks,
                    "foreign_keys": [],
                    "indexes": []
                })

            cursor.close()
            conn.close()
            return catalogs
        except Exception as e:
            logger.error(f"SQLite metadata extraction failed: {e}")
            raise RuntimeError(f"Failed to extract metadata from SQLite database at {db_path}: {e}")

    def profile_table(self, schema_name: str, table_name: str, columns: Optional[List[Dict[str, Any]]] = None, sample_size: int = 10000) -> Dict[str, Any]:
        return {
            "row_count": 0,
            "column_stats": {},
            "quality_score": 100.0
        }

    def fetch_data(self, query: str, limit: Optional[int] = None) -> pd.DataFrame:
        db_path = self._get_db_path()
        try:
            conn = sqlite3.connect(db_path)
            df = pd.read_sql(query, conn)
            conn.close()
            if limit and len(df) > limit:
                df = df.head(limit)
            return df
        except Exception as e:
            logger.error(f"SQLite fetch_data failed: {e}")
            raise RuntimeError(f"Failed to execute query on SQLite database: {e}")
