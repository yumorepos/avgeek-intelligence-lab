import os
from pathlib import Path


def _load_local_env_file() -> None:
    """Load backend/.env values for local development without external deps."""
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        if not key:
            continue

        cleaned = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, cleaned)


_load_local_env_file()


def _parse_cors_origins() -> list[str]:
    raw = os.getenv("FPI_CORS_ORIGINS") or os.getenv("CORS_ORIGINS") or ""
    parsed = [origin.strip() for origin in raw.split(",") if origin.strip()]

    if parsed:
        return parsed

    return [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://flight-price-intelligence-lab-iwnt.vercel.app",
        "https://flight-price-intelligence-lab.vercel.app",
    ]


class Settings:
    database_url: str | None = os.getenv("FPI_DATABASE_URL") or os.getenv("DATABASE_URL")
    use_csv_fallback: bool = os.getenv("FPI_USE_CSV_FALLBACK", "false").lower() == "true"
    cors_origins: list[str] = _parse_cors_origins()


settings = Settings()
