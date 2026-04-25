from pathlib import Path
from urllib.parse import quote, urlunparse, urlparse

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine.url import make_url

# config.py → app → apps/api → apps → repo root (works regardless of cwd when running uvicorn)
_REPO_ROOT = Path(__file__).resolve().parents[3]
_API_ROOT = Path(__file__).resolve().parents[1]
_INFRA_ENV = _REPO_ROOT / "infra" / ".env"
# Later files override earlier. Docker Compose reads infra/.env by default — include it so API
# credentials match Postgres even when repo root .env differs or only infra/.env exists.
_ENV_FILES = tuple(
    str(p)
    for p in (_REPO_ROOT / ".env", _INFRA_ENV, _API_ROOT / ".env")
    if p.is_file()
)


def _merge_redis_password(redis_url: str, password: str) -> str:
    """Apply password to redis_url netloc; host/port/path/scheme preserved (password URL-encoded)."""
    p = urlparse(redis_url)
    host = p.hostname or "localhost"
    port = p.port
    path = p.path or ""
    scheme = p.scheme or "redis"
    user = p.username
    pw = quote(password, safe="")
    if user:
        auth = f"{quote(user, safe='')}:{pw}"
    else:
        auth = f":{pw}"
    if port is not None:
        netloc = f"{auth}@{host}:{port}"
    else:
        netloc = f"{auth}@{host}"
    return urlunparse((scheme, netloc, path, "", p.query, p.fragment))


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_FILES if _ENV_FILES else None,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    environment: str = "development"
    secret_key: str = "changeme"

    # Database — POSTGRES_* must match Docker; DATABASE_URL host/port kept, credentials refreshed
    database_url: str = "postgresql+asyncpg://cm:changeme@localhost:5432/circuitmind"
    postgres_user: str = Field(default="cm", validation_alias=AliasChoices("POSTGRES_USER"))
    postgres_password: str = Field(default="changeme", validation_alias=AliasChoices("POSTGRES_PASSWORD"))
    postgres_db: str = Field(default="circuitmind", validation_alias=AliasChoices("POSTGRES_DB"))

    @model_validator(mode="after")
    def merge_postgres_credentials_into_database_url(self) -> "Settings":
        url = make_url(self.database_url)
        merged = url.set(
            username=self.postgres_user,
            password=self.postgres_password,
            database=self.postgres_db,
        )
        object.__setattr__(
            self,
            "database_url",
            merged.render_as_string(hide_password=False),
        )
        return self

    # Redis — REDIS_PASSWORD must match Docker; REDIS_URL host/port kept
    redis_url: str = "redis://localhost:6379"
    redis_password: str | None = Field(default=None, validation_alias=AliasChoices("REDIS_PASSWORD"))

    @model_validator(mode="after")
    def merge_redis_password_into_redis_url(self) -> "Settings":
        if self.redis_password is None:
            return self
        object.__setattr__(
            self,
            "redis_url",
            _merge_redis_password(self.redis_url, self.redis_password),
        )
        return self

    # LLM provider
    # Set LLM_PROVIDER to "anthropic" (default) or "ollama"
    # For Ollama: install https://ollama.com and run `ollama pull llama3.2`
    llm_provider: str = "anthropic"
    anthropic_api_key: str = ""
    claude_model: str = "claude-opus-4-6"

    # Ollama settings (used when llm_provider=ollama)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"

    @property
    def litellm_model(self) -> str:
        """Return the model string in LiteLLM format."""
        if self.llm_provider == "ollama":
            return f"ollama/{self.ollama_model}"
        return self.claude_model

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # ngspice
    ngspice_path: str = "/usr/bin/ngspice"


settings = Settings()
