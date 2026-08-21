from typing import Dict, Any, List, Optional
import pandas as pd
from app.connectors.base import BaseConnector
from app.utilities.logger import logger

SYSTEM_SCHEMAS_EXCLUDE_MSSQL = (
    'sys', 'INFORMATION_SCHEMA', 'db_owner', 'db_accessadmin', 'db_securityadmin',
    'db_ddladmin', 'db_datareader', 'db_datawriter', 'db_denydatareader', 'db_denydatawriter'
)


class MSSQLConnector(BaseConnector):
    """
    Microsoft SQL Server & Azure Synapse Metadata & Data Connector.
    Extracts metadata from ALL non-system schemas via sys catalog views or fallback simulation.
    """

    def _get_connection(self):
        """Attempts to open a connection to MS SQL Server using pyodbc or pymssql."""
        host = self.params.get("host") or "localhost"
        port = int(self.params.get("port") or 1433)
        database = self.params.get("database_name") or self.params.get("database") or "master"
        user = self.params.get("username") or self.params.get("user") or ""
        password = self.params.get("password") or ""
        options = self.params.get("options") or {}

        # 1. Try pyodbc
        try:
            import pyodbc
            drivers = pyodbc.drivers()
            target_driver = options.get("driver")
            if not target_driver:
                for preferred in ["ODBC Driver 18 for SQL Server", "ODBC Driver 17 for SQL Server", "SQL Server"]:
                    if preferred in drivers:
                        target_driver = preferred
                        break
                if not target_driver and drivers:
                    target_driver = drivers[0]

            if target_driver:
                server_strings = [host, f"{host},{port}"]
                is_win_auth = (not user or not password or password == "******")

                for srv in server_strings:
                    try:
                        if is_win_auth:
                            conn_str = (
                                f"DRIVER={{{target_driver}}};"
                                f"SERVER={srv};"
                                f"DATABASE={database};"
                                f"Trusted_Connection=yes;"
                                f"TrustServerCertificate=yes;"
                            )
                            return pyodbc.connect(conn_str, timeout=5)
                        else:
                            conn_str = (
                                f"DRIVER={{{target_driver}}};"
                                f"SERVER={srv};"
                                f"DATABASE={database};"
                                f"UID={user};"
                                f"PWD={password};"
                                f"TrustServerCertificate=yes;"
                            )
                            return pyodbc.connect(conn_str, timeout=5)
                    except Exception as e:
                        logger.debug(f"MSSQL pyodbc server '{srv}' attempt failed: {e}")

                # Retry with Windows Auth as fallback if SQL Auth failed on local server
                for srv in server_strings:
                    try:
                        conn_str = (
                            f"DRIVER={{{target_driver}}};"
                            f"SERVER={srv};"
                            f"DATABASE={database};"
                            f"Trusted_Connection=yes;"
                            f"TrustServerCertificate=yes;"
                        )
                        return pyodbc.connect(conn_str, timeout=5)
                    except Exception as e:
                        logger.debug(f"MSSQL pyodbc fallback win_auth for '{srv}' failed: {e}")

        except Exception as e:
            logger.debug(f"MSSQL pyodbc connection attempt failed: {e}")

        # 2. Try pymssql
        try:
            import pymssql
            return pymssql.connect(
                server=host,
                port=str(port),
                user=user if (user and password != "******") else "sa",
                password=password if (password and password != "******") else "",
                database=database,
                timeout=5
            )
        except Exception as e:
            logger.debug(f"MSSQL pymssql connection attempt failed: {e}")

        return None

    def test_connection(self) -> bool:
        logger.info(f"Testing MSSQL connection to {self.params.get('host')}:{self.params.get('port')}")
        conn = None
        try:
            conn = self._get_connection()
            if conn:
                conn.close()
                logger.info(f"Successfully connected to MSSQL at {self.params.get('host')}:{self.params.get('port')}")
                return True
        except Exception as e:
            logger.error(f"MSSQL connection test failed: {e}")
            return False
        finally:
            if conn and hasattr(conn, "close"):
                try:
                    conn.close()
                except Exception:
                    pass

        logger.error(f"Failed to connect to MSSQL database at {self.params.get('host')}:{self.params.get('port')}")
        return False

    def extract_metadata(self) -> List[Dict[str, Any]]:
        logger.info(f"Extracting MSSQL metadata across non-system schemas for database {self.params.get('database_name') or self.params.get('database')}")
        catalogs = []
        conn = None
        try:
            conn = self._get_connection()
            if not conn:
                raise RuntimeError(f"Failed to connect to MSSQL database '{self.params.get('database_name') or self.params.get('database')}' at host '{self.params.get('host')}'. Verify database instance, host, port, and credentials.")

            cursor = conn.cursor()

            # 1. Fetch tables
            tables_query = """
                SELECT s.name AS schema_name, t.name AS table_name, t.type_desc AS object_type
                FROM sys.tables t
                INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
                WHERE s.name NOT IN ('sys', 'INFORMATION_SCHEMA', 'db_owner', 'db_accessadmin', 'db_securityadmin', 'db_ddladmin', 'db_datareader', 'db_datawriter', 'db_denydatareader', 'db_denydatawriter')
                ORDER BY s.name, t.name;
            """
            cursor.execute(tables_query)
            tables_rows = cursor.fetchall()

            # 2. Fetch columns
            cols_query = """
                SELECT s.name AS schema_name, t.name AS table_name, c.name AS column_name,
                       tp.name AS data_type, c.is_nullable
                FROM sys.columns c
                INNER JOIN sys.tables t ON c.object_id = t.object_id
                INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
                INNER JOIN sys.types tp ON c.user_type_id = tp.user_type_id
                WHERE s.name NOT IN ('sys', 'INFORMATION_SCHEMA', 'db_owner', 'db_accessadmin', 'db_securityadmin', 'db_ddladmin', 'db_datareader', 'db_datawriter', 'db_denydatareader', 'db_denydatawriter')
                ORDER BY s.name, t.name, c.column_id;
            """
            cursor.execute(cols_query)
            cols_rows = cursor.fetchall()

            columns_map = {}
            for schema, table, col_name, data_type, is_nullable in cols_rows:
                key = (schema, table)
                if key not in columns_map:
                    columns_map[key] = []
                columns_map[key].append({
                    "name": col_name,
                    "type": str(data_type).upper(),
                    "nullable": bool(is_nullable),
                    "primary_key": False
                })

            # 3. Fetch primary keys
            pk_query = """
                SELECT s.name AS schema_name, t.name AS table_name, c.name AS column_name
                FROM sys.indexes i
                INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
                INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
                INNER JOIN sys.tables t ON i.object_id = t.object_id
                INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
                WHERE i.is_primary_key = 1
                  AND s.name NOT IN ('sys', 'INFORMATION_SCHEMA', 'db_owner', 'db_accessadmin', 'db_securityadmin', 'db_ddladmin', 'db_datareader', 'db_datawriter', 'db_denydatareader', 'db_denydatawriter');
            """
            cursor.execute(pk_query)
            pk_rows = cursor.fetchall()

            pk_map = {}
            for schema, table, col_name in pk_rows:
                key = (schema, table)
                if key not in pk_map:
                    pk_map[key] = []
                pk_map[key].append(col_name)

                if key in columns_map:
                    for col_dict in columns_map[key]:
                        if col_dict["name"] == col_name:
                            col_dict["primary_key"] = True

            # 4. Fetch foreign keys
            fk_query = """
                SELECT 
                    parent_schema.name AS schema_name,
                    parent_table.name AS table_name,
                    parent_column.name AS column_name,
                    fk.name AS constraint_name,
                    ref_schema.name AS foreign_schema,
                    ref_table.name AS foreign_table,
                    ref_column.name AS foreign_column
                FROM sys.foreign_keys fk
                INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
                INNER JOIN sys.tables parent_table ON fkc.parent_object_id = parent_table.object_id
                INNER JOIN sys.schemas parent_schema ON parent_table.schema_id = parent_schema.schema_id
                INNER JOIN sys.columns parent_column ON fkc.parent_object_id = parent_column.object_id AND fkc.parent_column_id = parent_column.column_id
                INNER JOIN sys.tables ref_table ON fkc.referenced_object_id = ref_table.object_id
                INNER JOIN sys.schemas ref_schema ON ref_table.schema_id = ref_schema.schema_id
                INNER JOIN sys.columns ref_column ON fkc.referenced_object_id = ref_column.object_id AND fkc.referenced_column_id = ref_column.column_id
                WHERE parent_schema.name NOT IN ('sys', 'INFORMATION_SCHEMA', 'db_owner', 'db_accessadmin', 'db_securityadmin', 'db_ddladmin', 'db_datareader', 'db_datawriter', 'db_denydatareader', 'db_denydatawriter');
            """
            cursor.execute(fk_query)
            fk_rows = cursor.fetchall()

            fk_map = {}
            for schema, table, col_name, constr_name, f_schema, f_table, f_col in fk_rows:
                key = (schema, table)
                if key not in fk_map:
                    fk_map[key] = []
                fk_map[key].append({
                    "constraint_name": constr_name,
                    "column": col_name,
                    "foreign_schema": f_schema,
                    "foreign_table": f_table,
                    "foreign_column": f_col
                })

            # 5. Fetch table row counts
            row_counts_map = {}
            try:
                rc_query = """
                    SELECT s.name AS schema_name, t.name AS table_name, SUM(p.rows) AS row_count
                    FROM sys.tables t
                    INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
                    INNER JOIN sys.partitions p ON t.object_id = p.object_id AND p.index_id IN (0,1)
                    WHERE s.name NOT IN ('sys', 'INFORMATION_SCHEMA', 'db_owner', 'db_accessadmin', 'db_securityadmin', 'db_ddladmin', 'db_datareader', 'db_datawriter', 'db_denydatareader', 'db_denydatawriter')
                    GROUP BY s.name, t.name;
                """
                cursor.execute(rc_query)
                for s_name, t_name, n_tup in cursor.fetchall():
                    row_counts_map[(s_name, t_name)] = int(n_tup or 0)
            except Exception:
                pass

            for schema, table, obj_type in tables_rows:
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
            logger.info(f"Live MSSQL Metadata Extraction retrieved {len(catalogs)} tables across schemas")
            return catalogs
        except Exception as e:
            logger.error(f"Live MSSQL metadata extraction failed: {e}")
            raise RuntimeError(f"Failed to connect to MSSQL database at {self.params.get('host')}:{self.params.get('port')}: {str(e)}")
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
                cursor.execute(f"SELECT COUNT(1) FROM [{schema_name}].[{table_name}]")
                res = cursor.fetchone()
                if res:
                    rows = res[0] or 0

                for col in col_list:
                    col_name = col.get("name") if isinstance(col, dict) else str(col)
                    col_type = col.get("type", "VARCHAR") if isinstance(col, dict) else "VARCHAR"
                    null_pct = 0.0
                    distinct = 0
                    try:
                        prof_sql = f"""
                            SELECT 
                                SUM(CASE WHEN [{col_name}] IS NULL THEN 1 ELSE 0 END) AS null_cnt,
                                COUNT(DISTINCT [{col_name}]) AS dist_cnt
                            FROM [{schema_name}].[{table_name}]
                        """
                        cursor.execute(prof_sql)
                        row_stat = cursor.fetchone()
                        if row_stat:
                            null_cnt = row_stat[0] or 0
                            dist_cnt = row_stat[1] or 0
                            null_pct = round((null_cnt / rows) * 100.0, 1) if rows > 0 else 0.0
                            distinct = int(dist_cnt)
                    except Exception as e:
                        logger.debug(f"Failed to profile column {col_name} on [{schema_name}].[{table_name}]: {e}")

                    pii_tagged = False
                    pii_type = None
                    c_lower = col_name.lower()
                    if any(k in c_lower for k in ["email", "mail"]):
                        pii_tagged, pii_type = True, "EMAIL"
                    elif any(k in c_lower for k in ["phone", "mobile", "tel"]):
                        pii_tagged, pii_type = True, "PHONE"
                    elif any(k in c_lower for k in ["ssn", "tax", "tin"]):
                        pii_tagged, pii_type = True, "SSN"
                    elif any(k in c_lower for k in ["name", "fname", "lname"]):
                        pii_tagged, pii_type = True, "NAME"

                    stat_entry = {
                        "data_type": col_type,
                        "null_pct": null_pct,
                        "distinct_count": distinct,
                        "pii_tagged": pii_tagged
                    }
                    if pii_type:
                        stat_entry["pii_type"] = pii_type
                    column_stats[col_name] = stat_entry

                cursor.close()
                conn.close()

                null_pcts = [s["null_pct"] for s in column_stats.values()] if column_stats else [0.0]
                avg_null = sum(null_pcts) / len(null_pcts) if null_pcts else 0.0
                q_score = round(max(0.0, 100.0 - avg_null), 1)

                return {
                    "row_count": rows,
                    "column_stats": column_stats,
                    "quality_score": q_score
                }
        except Exception as e:
            logger.error(f"Live MSSQL table profiling failed for [{schema_name}].[{table_name}]: {e}")
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
            logger.error(f"MSSQL fetch_data query failed: {e}")
            raise RuntimeError(f"Failed to execute query on MSSQL: {e}")
        finally:
            if conn and hasattr(conn, "close"):
                try:
                    conn.close()
                except Exception:
                    pass
        return pd.DataFrame()

