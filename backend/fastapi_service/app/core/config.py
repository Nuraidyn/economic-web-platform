import os

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
