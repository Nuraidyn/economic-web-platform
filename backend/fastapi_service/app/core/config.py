import os
from pathlib import Path

from dotenv import load_dotenv

# Load env files early so os.getenv values below can read them.
_THIS_FILE = Path(__file__).resolve()
_SERVICE_DIR = _THIS_FILE.parents[2]
_PROJECT_ROOT = _THIS_FILE.parents[4]
load_dotenv(_PROJECT_ROOT / ".env", override=False)
load_dotenv(_SERVICE_DIR / ".env", override=False)

APP_ENV = os.getenv("APP_ENV", "development")
DJANGO_AUTH_URL = os.getenv("DJANGO_AUTH_URL", "http://127.0.0.1:8000")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./fastapi.db")
JWT_SECRET = os.getenv("DJANGO_SECRET_KEY", os.getenv("JWT_SECRET", "dev-secret-key"))
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

# CORS
CORS_ALLOW_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOW_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

# AuthZ (live role/agreement) via Django introspection
AUTHZ_INTROSPECT_PATH = os.getenv("AUTHZ_INTROSPECT_PATH", "/api/auth/introspect")
AUTHZ_INTROSPECT_TIMEOUT_SECONDS = float(os.getenv("AUTHZ_INTROSPECT_TIMEOUT_SECONDS", "3.5"))
AUTHZ_CACHE_TTL_SECONDS = int(os.getenv("AUTHZ_CACHE_TTL_SECONDS", "60"))
# If strict, protected endpoints fail closed when Django introspection is unavailable.
AUTHZ_INTROSPECT_STRICT = os.getenv("AUTHZ_INTROSPECT_STRICT", "1") == "1"

# Rate limiting (simple in-memory; dev-friendly)
RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "1") == "1"
RATE_LIMIT_RPS = float(os.getenv("RATE_LIMIT_RPS", "5"))
RATE_LIMIT_BURST = int(os.getenv("RATE_LIMIT_BURST", "20"))

# AI chart explanation agent
CHART_EXPLAIN_PROVIDER = os.getenv("CHART_EXPLAIN_PROVIDER", "openai").strip().lower()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_TIMEOUT_SECONDS = float(os.getenv("OPENAI_TIMEOUT_SECONDS", "20"))
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_BASE_URL = os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")
CHART_EXPLAIN_MAX_COUNTRIES = int(os.getenv("CHART_EXPLAIN_MAX_COUNTRIES", "4"))
CHART_EXPLAIN_MAX_INDICATORS = int(os.getenv("CHART_EXPLAIN_MAX_INDICATORS", "4"))
