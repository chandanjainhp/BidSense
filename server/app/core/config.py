from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    @property
    def async_database_url(self) -> str:
        """Ensure DATABASE_URL uses asyncpg driver."""
        if not self.DATABASE_URL.startswith("postgresql+asyncpg"):
            return self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
        return self.DATABASE_URL

    # Redis
    REDIS_URL: str = Field(default="redis://localhost:6379/0")

    # JWT
    SECRET_KEY: str = Field(default="change-this-secret-key-in-production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=14)

    # CORS
    CORS_ORIGINS: str = Field(default="http://localhost:5173,http://127.0.0.1:5173")

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    # AI Provider
    AI_PROVIDER: str = Field(default="openai")
    AI_API_KEY: str = Field(default="")
    AI_MODEL: str = Field(default="gpt-4o-mini")
    # OpenAI-compatible embeddings model used by the RAG knowledge base
    AI_EMBEDDING_MODEL: str = Field(default="text-embedding-3-small")

    # Email / SMTP
    SMTP_HOST: str = Field(default="smtp.example.com")
    SMTP_PORT: int = Field(default=587)
    SMTP_USER: str = Field(default="noreply@example.com")
    SMTP_PASSWORD: str = Field(default="")
    SMTP_FROM_EMAIL: str = Field(default="noreply@example.com")
    SMTP_FROM_NAME: str = Field(default="BidSense")

    # File Storage
    MEDIA_ROOT: str = Field(default="/workspace/server/media")
    MAX_UPLOAD_SIZE_MB: int = Field(default=10)

    # App
    APP_ENV: str = Field(default="development")
    DEBUG: bool = Field(default=True)

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
