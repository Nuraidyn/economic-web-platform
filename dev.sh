set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DJANGO_DIR="$ROOT_DIR/backend/django_service"
FASTAPI_DIR="$ROOT_DIR/backend/fastapi_service"
FRONTEND_DIR="$ROOT_DIR/frontend"

is_port_in_use() {
  local port="$1"
  lsof -n -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

pick_free_port() {
  local port="${1}"
  while is_port_in_use "$port"; do
    port=$((port + 1))
  done
  echo "$port"
}

cleanup() {
  if [[ -n "${DJANGO_PID:-}" ]]; then kill "$DJANGO_PID" 2>/dev/null || true; fi
  if [[ -n "${FASTAPI_PID:-}" ]]; then kill "$FASTAPI_PID" 2>/dev/null || true; fi
  if [[ -n "${FRONTEND_PID:-}" ]]; then kill "$FRONTEND_PID" 2>/dev/null || true; fi
  wait 2>/dev/null || true
}

trap cleanup EXIT INT TERM

# Choose ports that won't collide with already running services.
FRONTEND_PORT="$(pick_free_port "${FRONTEND_PORT:-5173}")"
DJANGO_PORT="$(pick_free_port "${DJANGO_PORT:-8000}")"
FASTAPI_PORT="$(pick_free_port "${FASTAPI_PORT:-8001}")"
# Avoid self-collision if both defaults resolve to the same free port.
if [[ "${FASTAPI_PORT}" == "${DJANGO_PORT}" ]]; then
  FASTAPI_PORT="$(pick_free_port "$((FASTAPI_PORT + 1))")"
fi

# Keep CORS aligned with the actual Vite port.
FRONTEND_ORIGINS="http://localhost:${FRONTEND_PORT},http://127.0.0.1:${FRONTEND_PORT},http://localhost:5173,http://127.0.0.1:5173"

echo "Using ports: frontend=${FRONTEND_PORT} django=${DJANGO_PORT} fastapi=${FASTAPI_PORT}" >&2

(
  cd "$DJANGO_DIR"
  source .venv/bin/activate
  export DJANGO_CORS_ALLOWED_ORIGINS="$FRONTEND_ORIGINS"
  python manage.py migrate
  python manage.py runserver "127.0.0.1:${DJANGO_PORT}"
) &
DJANGO_PID=$!

(
  cd "$FASTAPI_DIR"
  source .venv/bin/activate
  export DJANGO_AUTH_URL="http://127.0.0.1:${DJANGO_PORT}"
  export CORS_ALLOW_ORIGINS="$FRONTEND_ORIGINS"
  uvicorn app.main:app --reload --port "${FASTAPI_PORT}"
) &
FASTAPI_PID=$!

(
  cd "$FRONTEND_DIR"
  export VITE_DJANGO_URL="http://127.0.0.1:${DJANGO_PORT}/api"
  export VITE_FASTAPI_URL="http://127.0.0.1:${FASTAPI_PORT}/api/v1"
  npm run dev -- --port "${FRONTEND_PORT}" --host 127.0.0.1
) &
FRONTEND_PID=$!

wait
