import os
from pathlib import Path

from dotenv import load_dotenv

# Load env files early so os.getenv values below can read them.
_THIS_FILE = Path(__file__).resolve()
_SERVICE_DIR = _THIS_FILE.parents[2]
# Try to find project root, but if it doesn't exist (e.g., in Docker), just use service dir
try:
    _PROJECT_ROOT = _THIS_FILE.parents[4]
    if not _PROJECT_ROOT.exists():
        _PROJECT_ROOT = _SERVICE_DIR
except IndexError:
    _PROJECT_ROOT = _SERVICE_DIR

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
AUTHZ_CACHE_MAXSIZE = int(os.getenv("AUTHZ_CACHE_MAXSIZE", "10000"))
# If strict, protected endpoints fail closed when Django introspection is unavailable.
AUTHZ_INTROSPECT_STRICT = os.getenv("AUTHZ_INTROSPECT_STRICT", "1") == "1"

# Rate limiting (Redis-based token bucket)
RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "1") == "1"
RATE_LIMIT_RPS = float(os.getenv("RATE_LIMIT_RPS", "5"))
RATE_LIMIT_BURST = int(os.getenv("RATE_LIMIT_BURST", "20"))
REDIS_URL = os.getenv("REDIS_URL", "")  # empty → Redis disabled, permissive fallback
# fail-open=1: allow requests when Redis is down (default for dev)
# fail-open=0: return 503 when Redis is down (recommended for prod)
_default_fail_open = "0" if APP_ENV == "production" else "1"
RATE_LIMIT_REDIS_FAIL_OPEN = os.getenv("RATE_LIMIT_REDIS_FAIL_OPEN", _default_fail_open) == "1"

# AI chart explanation agent
CHART_EXPLAIN_PROVIDER = os.getenv("CHART_EXPLAIN_PROVIDER", "openai").strip().lower()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_TIMEOUT_SECONDS = float(os.getenv("OPENAI_TIMEOUT_SECONDS", "20"))
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_BASE_URL = os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")
GEMINI_TIMEOUT_SECONDS = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "20"))
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_BASE_URL = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
GROQ_TIMEOUT_SECONDS = float(os.getenv("GROQ_TIMEOUT_SECONDS", "20"))
CHART_EXPLAIN_MAX_COUNTRIES = int(os.getenv("CHART_EXPLAIN_MAX_COUNTRIES", "4"))
CHART_EXPLAIN_MAX_INDICATORS = int(os.getenv("CHART_EXPLAIN_MAX_INDICATORS", "4"))
