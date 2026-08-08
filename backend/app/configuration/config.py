import os
from typing import List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application Settings managing configuration parameters.
    No hardcoded values; all parameters can be overridden via environment variables or .env file.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # Application Info
    APP_NAME: str = Field(default="Quick-Pasteur Enterprise Platform", description="Application Name")
    APP_VERSION: str = Field(default="1.0.0", description="Application Version")
    API_V1_STR: str = Field(default="/api/v1", description="API Version Prefix")
    ENVIRONMENT: str = Field(default="development", description="Execution Environment: development, qa, uat, production")
    DEBUG: bool = Field(default=False, description="Debug Mode Flag")

    # Security & Encryption
    SECRET_KEY: str = Field(
        default="09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7",
        description="JWT Secret Key for Token Generation"
    )
    ALGORITHM: str = Field(default="HS256", description="JWT Signing Algorithm")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60, description="Access Token Expiration in Minutes")
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, description="Refresh Token Expiration in Days")
    ENCRYPTION_KEY: str = Field(
        default="gqV8x8z79t8B20V1Z1Y7v5U3w1X9y7Z5v3U1t9S7r5P=",
        description="Base64 Encrypted Key for Database Credentials AES-256 GCM Encryption"
    )

    # Database Configuration (Microsoft SQL Server Application Database)
    DB_SERVER: str = Field(default="localhost", description="SQL Server Hostname or IP")
    DB_PORT: int = Field(default=1433, description="SQL Server Port")
    DB_USER: str = Field(default="sa", description="SQL Server Database User")
    DB_PASSWORD: str = Field(default="YourStrongPass123!", description="SQL Server Database Password")
    DB_NAME: str = Field(default="QuickPasteurDB", description="SQL Server Application Database Name")
    DB_DRIVER: str = Field(default="ODBC Driver 18 for SQL Server", description="SQL Server ODBC Driver")
    DB_POOL_SIZE: int = Field(default=20, description="SQLAlchemy Connection Pool Size")
    DB_MAX_OVERFLOW: int = Field(default=10, description="SQLAlchemy Connection Max Overflow")

    @property
    def DATABASE_URL(self) -> str:
        """Constructs the SQLAlchemy connection URI for MS SQL Server via pyodbc."""
        encoded_driver = self.DB_DRIVER.replace(" ", "+")
        return (
            f"mssql+pyodbc://{self.DB_USER}:{self.DB_PASSWORD}@"
            f"{self.DB_SERVER}:{self.DB_PORT}/{self.DB_NAME}?"
            f"driver={encoded_driver}&TrustServerCertificate=yes"
        )

    # Redis & Celery Configuration
    REDIS_HOST: str = Field(default="localhost", description="Redis Server Host")
    REDIS_PORT: int = Field(default=6379, description="Redis Server Port")
    REDIS_DB: int = Field(default=0, description="Redis DB Index")
    REDIS_PASSWORD: Optional[str] = Field(default=None, description="Redis Password")

    @property
    def REDIS_URL(self) -> str:
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    # CORS Allowed Origins
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:4200", "http://127.0.0.1:4200", "http://localhost:8000"],
        description="Allowed CORS Origins"
    )

    # System Storage Directories
    ONTOLOGY_STORAGE_PATH: str = Field(default="./storage/ontologies", description="Directory to store generated OWL/RDF files")
    EXPORT_STORAGE_PATH: str = Field(default="./storage/exports", description="Directory for graph & metadata exports")


settings = Settings()
