from typing import Dict, Any, List, Optional
import pandas as pd
from app.connectors.base import BaseConnector
from app.utilities.logger import logger

SYSTEM_SCHEMAS_EXCLUDE_MYSQL = (
    'information_schema', 'mysql', 'performance_schema', 'sys'
)


class MySQLConnector(BaseConnector):
    """
    MySQL & MariaDB Connector implementation.
    Extracts metadata from ALL non-system schemas via information_schema or fallback simulation.
    """

    def _get_connection(self):
        """Attempts to open a connection to MySQL/MariaDB using pymysql."""
        import pymysql

        host = self.params.get("host", "localhost")
        port = int(self.params.get("port") or 3306)
        database = self.params.get("database_name") or self.params.get("database") or "mysql"
        user = self.params.get("username") or self.params.get("user") or "root"
        password = self.params.get("password") or ""

        return pymysql.connect(
            host=host,
            port=port,
            database=database,
            user=user,
            password=password,
            connect_timeout=5,
            cursorclass=pymysql.cursors.DictCursor
        )

    def test_connection(self) -> bool:
        logger.info(f"Testing MySQL connection to {self.params.get('host')}:{self.params.get('port')}")
        conn = None
        try:
            conn = self._get_connection()
            if conn:
                conn.close()
                logger.info(f"Successfully connected to MySQL at {self.params.get('host')}:{self.params.get('port')}")
                return True
        except Exception as e:
            logger.error(f"MySQL connection test failed: {e}")
            return False
        finally:
            if conn and hasattr(conn, "close"):
                try:
                    conn.close()
                except Exception:
                    pass

        logger.error(f"Failed to connect to MySQL database at {self.params.get('host')}:{self.params.get('port')}")
        return False

    def extract_metadata(self) -> List[Dict[str, Any]]:
        target_db = self.params.get("database_name") or "main"
        logger.info(f"Extracting MySQL metadata across schemas (Target DB: {target_db})")
        catalogs = []
        conn = None
        try:
            conn = self._get_connection()
            if not conn:
                raise RuntimeError(f"Failed to connect to MySQL database at {self.params.get('host')}:{self.params.get('port')}. Server is unreachable.")

            cursor = conn.cursor()

            # 1. Fetch tables
            tables_query = """
                SELECT table_schema, table_name, table_type
                FROM information_schema.tables
                WHERE table_schema NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
                ORDER BY table_schema, table_name;
            """
            cursor.execute(tables_query)
            tables_rows = cursor.fetchall()

            # 2. Fetch columns
            cols_query = """
                SELECT table_schema, table_name, column_name, data_type, is_nullable, column_key
                FROM information_schema.columns
                WHERE table_schema NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
                ORDER BY table_schema, table_name, ordinal_position;
            """
            cursor.execute(cols_query)
            cols_rows = cursor.fetchall()

            columns_map = {}
            pk_map = {}
            for row in cols_rows:
                schema = row["table_schema"]
                table = row["table_name"]
                col_name = row["column_name"]
                data_type = row["data_type"]
                is_nullable = row["is_nullable"]
                col_key = row.get("column_key", "")

                key = (schema, table)
                if key not in columns_map:
                    columns_map[key] = []
                is_pk = (col_key == "PRI")
                columns_map[key].append({
                    "name": col_name,
                    "type": str(data_type).upper(),
                    "nullable": (is_nullable == "YES"),
                    "primary_key": is_pk
                })
                if is_pk:
                    if key not in pk_map:
                        pk_map[key] = []
                    pk_map[key].append(col_name)

            # 3. Fetch foreign keys
            fk_query = """
                SELECT 
                    kcu.table_schema AS schema_name,
                    kcu.table_name AS table_name,
                    kcu.column_name AS column_name,
                    kcu.constraint_name AS constraint_name,
                    kcu.referenced_table_schema AS foreign_schema,
                    kcu.referenced_table_name AS foreign_table,
                    kcu.referenced_column_name AS foreign_column
                FROM information_schema.key_column_usage kcu
                JOIN information_schema.table_constraints tc
                  ON kcu.constraint_name = tc.constraint_name
                 AND kcu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
                  AND kcu.referenced_table_name IS NOT NULL
                  AND kcu.table_schema NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys');
            """
            cursor.execute(fk_query)
            fk_rows = cursor.fetchall()

            fk_map = {}
            for row in fk_rows:
                key = (row["schema_name"], row["table_name"])
                if key not in fk_map:
                    fk_map[key] = []
                fk_map[key].append({
                    "constraint_name": row["constraint_name"],
                    "column": row["column_name"],
                    "foreign_schema": row["foreign_schema"],
                    "foreign_table": row["foreign_table"],
                    "foreign_column": row["foreign_column"]
                })

            # 4. Fetch row counts
            row_counts_map = {}
            try:
                rc_query = """
                    SELECT table_schema, table_name, COALESCE(table_rows, 0) AS row_count
                    FROM information_schema.tables
                    WHERE table_schema NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys');
                """
                cursor.execute(rc_query)
                for row in cursor.fetchall():
                    row_counts_map[(row["table_schema"], row["table_name"])] = int(row["row_count"] or 0)
            except Exception:
                pass

            for row in tables_rows:
                schema = row["table_schema"]
                table = row["table_name"]
                obj_type = row["table_type"]
                key = (schema, table)
                t_rows = row_counts_map.get(key, 0)

                catalogs.append({
                    "schema_name": schema,
                    "table_name": table,
                    "object_type": "VIEW" if "VIEW" in str(obj_type).upper() else "TABLE",
                    "row_count": t_rows,
                    "columns": columns_map.get(key, []),
                    "primary_keys": pk_map.get(key, []),
                    "foreign_keys": fk_map.get(key, []),
                    "indexes": []
                })

            cursor.close()
            conn.close()
            logger.info(f"Live MySQL Metadata Extraction retrieved {len(catalogs)} tables")
            return catalogs
        except Exception as e:
            logger.error(f"Live MySQL metadata extraction failed: {e}")
            raise RuntimeError(f"Failed to connect to MySQL database at {self.params.get('host')}:{self.params.get('port')}: {str(e)}")
        finally:
            if conn and hasattr(conn, "close"):
                try:
                    conn.close()
                except Exception:
                    pass

    def profile_table(self, schema_name: str, table_name: str, columns: Optional[List[Dict[str, Any]]] = None, sample_size: int = 10000) -> Dict[str, Any]:
        conn = None
        rows = 0
        column_stats = {}
        col_list = columns or []

        try:
            conn = self._get_connection()
            if conn:
                cursor = conn.cursor()
                cursor.execute(f"SELECT COUNT(1) AS cnt FROM `{schema_name}`.`{table_name}`")
                res = cursor.fetchone()
                if res and "cnt" in res:
                    rows = res["cnt"]
                cursor.close()
                conn.close()
        except Exception:
            pass
        finally:
            if conn and hasattr(conn, "close"):
                try:
                    conn.close()
                except Exception:
                    pass

        return {
            "row_count": rows,
            "column_stats": column_stats,
            "quality_score": 100.0
        }

    def fetch_data(self, query: str, limit: Optional[int] = None) -> pd.DataFrame:
        conn = None
        try:
            conn = self._get_connection()
            if conn:
                df = pd.read_sql(query, conn)
                conn.close()
                if limit and len(df) > limit:
                    df = df.head(limit)
                return df
        except Exception as e:
            logger.error(f"MySQL fetch_data live query failed: {e}")
            raise RuntimeError(f"Failed to execute query on MySQL: {e}")
        finally:
            if conn and hasattr(conn, "close"):
                try:
                    conn.close()
                except Exception:
                    pass
        return pd.DataFrame()
