import os

APP_ENV = os.getenv("APP_ENV", "development")
DJANGO_AUTH_URL = os.getenv("DJANGO_AUTH_URL", "http://127.0.0.1:8000")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./fastapi.db")
JWT_SECRET = os.getenv("DJANGO_SECRET_KEY", os.getenv("JWT_SECRET", "dev-secret-key"))
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
