set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DJANGO_DIR="$ROOT_DIR/backend/django_service"
FASTAPI_DIR="$ROOT_DIR/backend/fastapi_service"
FRONTEND_DIR="$ROOT_DIR/frontend"

is_port_in_use() {
  local port="$1"
  lsof -n -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

cleanup() {
  if [[ -n "${DJANGO_PID:-}" ]]; then kill "$DJANGO_PID" 2>/dev/null || true; fi
  if [[ -n "${FASTAPI_PID:-}" ]]; then kill "$FASTAPI_PID" 2>/dev/null || true; fi
  if [[ -n "${FRONTEND_PID:-}" ]]; then kill "$FRONTEND_PID" 2>/dev/null || true; fi
  wait 2>/dev/null || true
}

trap cleanup EXIT INT TERM

(
  cd "$DJANGO_DIR"
  source .venv/bin/activate
  python manage.py migrate
  if is_port_in_use 8000; then
    echo "Port 8000 already in use; skipping Django." >&2
    exit 0
  fi
  python manage.py runserver 127.0.0.1:8000
) &
DJANGO_PID=$!

(
  cd "$FASTAPI_DIR"
  source .venv/bin/activate
  if is_port_in_use 8001; then
    echo "Port 8001 already in use; skipping FastAPI." >&2
    exit 0
  fi
  uvicorn app.main:app --reload --port 8001
) &
FASTAPI_PID=$!

(
  cd "$FRONTEND_DIR"
  npm run dev
) &
FRONTEND_PID=$!

wait
