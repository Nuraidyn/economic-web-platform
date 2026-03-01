# Economic Web Platform

Full-stack учебный проект для сравнительного анализа и визуализации экономических индикаторов по странам.

Стек:
- Frontend: React + Vite + Tailwind + Chart.js
- Backend API: FastAPI
- Auth/Admin: Django + DRF + SimpleJWT
- DB: PostgreSQL (docker) / SQLite (local fallback)

## Что умеет платформа

- Сравнение стран по экономическим индикаторам и временным рядам.
- Визуализация Gini/Lorenz и связанных метрик неравенства.
- Forecast-панель с базовыми прогнозами.
- JWT-аутентификация, роли, пользовательские соглашения.
- Сохранение пресетов анализа.
- AI-пояснение графиков (через backend endpoint).
- Локализация интерфейса (RU/KZ/EN).

## Архитектура и документация

- Архитектура: `docs/architecture.md`
- План улучшений: `docs/upgrade_plan.md`

## Быстрый старт

### Вариант 1: Docker (рекомендуется)

Из корня репозитория:

```bash
docker compose up -d --build
```

Остановить:

```bash
docker compose down
```

Сервисы после запуска:
- Frontend: `http://localhost:5173`
- Django API: `http://127.0.0.1:8000/api`
- FastAPI API: `http://127.0.0.1:8001/api/v1`

### Вариант 2: dev.sh

```bash
bash dev.sh
```

Для Windows: используйте WSL/Git Bash (в чистом PowerShell `bash` может быть недоступен).

## Локальный запуск по сервисам

### Django

```bash
cd backend/django_service
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/macOS
pip install -r ../requirements-django.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

### FastAPI

```bash
cd backend/fastapi_service
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/macOS
pip install -r ../requirements-fastapi.txt
uvicorn app.main:app --reload --port 8001
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Тесты

### Frontend

```bash
cd frontend
npm test
```

### Django

```bash
cd backend/django_service
python manage.py test core.tests -v 2
```

### FastAPI

```bash
cd backend/fastapi_service
python -m unittest discover -s tests -p "test_*.py" -v
```

## Основные переменные окружения

### Frontend

- `VITE_DJANGO_URL` (default: `http://127.0.0.1:8000/api`)
- `VITE_FASTAPI_URL` (default: `http://127.0.0.1:8001/api/v1`)

### Django

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG`
- `DJANGO_ALLOWED_HOSTS`
- `DJANGO_DB_*`
- `DJANGO_THROTTLE_AUTH`
- `DJANGO_THROTTLE_AGREEMENTS`

### FastAPI

- `DATABASE_URL`
- `DJANGO_AUTH_URL`
- `DJANGO_SECRET_KEY` или `JWT_SECRET`
- `JWT_ALGORITHM`
- `CORS_ALLOW_ORIGINS`
- `AUTHZ_INTROSPECT_PATH`
- `AUTHZ_CACHE_TTL_SECONDS`
- `AUTHZ_INTROSPECT_TIMEOUT_SECONDS`
- `AUTHZ_INTROSPECT_STRICT`
- `RATE_LIMIT_ENABLED`, `RATE_LIMIT_RPS`, `RATE_LIMIT_BURST`
- `CHART_EXPLAIN_PROVIDER`, `OPENAI_*`, `GEMINI_*`

## Security model

- Django выдаёт JWT (роль + agreement claims).
- FastAPI валидирует JWT и запрашивает актуальный auth-context через Django introspection endpoint.
- Доступ к защищённым endpoint зависит от роли и статуса соглашения.

## Ingestion (опционально)

Если нужно заранее загрузить baseline-данные в FastAPI БД:

```bash
cd backend/fastapi_service
python scripts/ingest_baseline.py --token YOUR_JWT
```

Требуется JWT с ролью `researcher` или `admin`.

