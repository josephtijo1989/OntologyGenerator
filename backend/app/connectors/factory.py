from typing import Dict, Any, Type
from app.connectors.base import BaseConnector
from app.connectors.mssql import MSSQLConnector
from app.connectors.postgresql import PostgreSQLConnector
from app.connectors.mysql import MySQLConnector
from app.connectors.oracle import OracleConnector
from app.connectors.sqlite import SQLiteConnector
from app.connectors.snowflake import SnowflakeConnector
from app.models.domain import SourceConnectorType
from app.utilities.logger import logger


class ConnectorFactory:
    """
    Factory pattern for dynamically instantiating source database connectors
    based on connector type enumeration.
    """
    _registry: Dict[SourceConnectorType, Type[BaseConnector]] = {
        SourceConnectorType.MSSQL: MSSQLConnector,
        SourceConnectorType.SYNAPSE: MSSQLConnector,
        SourceConnectorType.POSTGRESQL: PostgreSQLConnector,
        SourceConnectorType.REDSHIFT: PostgreSQLConnector,
        SourceConnectorType.MYSQL: MySQLConnector,
        SourceConnectorType.MARIADB: MySQLConnector,
        SourceConnectorType.ORACLE: OracleConnector,
        SourceConnectorType.SQLITE: SQLiteConnector,
        SourceConnectorType.SNOWFLAKE: SnowflakeConnector,
        SourceConnectorType.DATABRICKS: SnowflakeConnector,
    }

    @classmethod
    def get_connector(cls, connector_type: Any, connection_params: Dict[str, Any]) -> BaseConnector:
        if isinstance(connector_type, str):
            try:
                connector_type = SourceConnectorType[connector_type.upper()]
            except KeyError:
                try:
                    connector_type = SourceConnectorType(connector_type)
                except ValueError:
                    pass

        connector_cls = cls._registry.get(connector_type)
        if not connector_cls:
            logger.error(f"Unsupported connector type: {connector_type}")
            raise ValueError(f"Unsupported database connector type: {connector_type}")
        return connector_cls(connection_params)

    @classmethod
    def register_connector(cls, connector_type: SourceConnectorType, connector_cls: Type[BaseConnector]):
        """Allows runtime extension to add custom database plugins without altering core application code."""
        cls._registry[connector_type] = connector_cls
        logger.info(f"Registered new database connector plugin: {connector_type}")
