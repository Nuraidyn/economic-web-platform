## The Lorenz Curve and the Gini Index Dashboard

Full-stack учебный проект дипломной тематики «Development of a Web Platform for Analyzing Income Inequality Using the Lorenz Curve and the Gini Index on the Example of Different Countries».  
Фронтенд (React + Vite + Tailwind + Chart.js) строит графики Lorenz/Gini и сравнения по странам. Бэкенд разделен на Django (аутентификация, роли, соглашения, админ) и FastAPI (ингест данных, аналитика, прогнозы).

Документация по архитектуре: `docs/architecture.md`.
План апгрейда до market-ready продукта: `docs/upgrade_plan.md` (ветка `feature/market-ready-platform`).

## Возможности

- Time-series сравнение индикаторов неравенства (Gini index, доли дохода по децилям/квинтилям) для нескольких стран.
- Lorenz Curve режим: фронтенд автоматически грузит квинтильные доли дохода (`SI.DST.*` индикаторы) и строит кривую Лоренца с линией абсолютного равенства.
- Inequality trend: загрузка временного ряда Gini (`SI.POV.GINI`) и сравнение трендов по странам (в ветке `feature/market-ready-platform`).
- Экспорт: CSV для сравнений и прогнозов + “Download PNG” для графиков (в ветке `feature/market-ready-platform`).
- Saved presets: сохранение/загрузка наборов фильтров (страны/индикаторы/годы/тип графика) в Django (в ветке `feature/market-ready-platform`).
- AI Chart Agent: объяснение графиков по пользовательскому вопросу через FastAPI endpoint `/api/v1/analytics/chart/explain` (OpenAI/Gemini + локальный fallback).
- Интерфейс поддерживает переключение языка: `RU / KZ / EN`; AI агент отвечает на языке, выбранном в UI.

## Быстрый запуск (1 команда)

Запускать из корня репозитория:

```bash
bash dev.sh
```

После запуска:

- **Frontend (UI)**: `http://localhost:5173`
- **Django API**: `http://127.0.0.1:8000/api` (может быть уже запущен отдельно; `dev.sh` пропустит запуск, если порт занят)
- **FastAPI API**: `http://127.0.0.1:8001/api/v1`

### Простой режим данных (по умолчанию)

Для функций сравнения (`/observations`) и прогнозирования (`/forecast`) **не требуется ingestion**.
Если в FastAPI базе нет данных, сервис **запрашивает временные ряды напрямую из World Bank API** и возвращает их “на лету”.

Это означает:

- `backend/fastapi_service/fastapi.db` может оставаться пустой (`observations = 0`) — это нормально.
- Графики и forecast должны работать сразу после запуска.

## Запуск по отдельности (если нужно)

**Django**
```bash
cd backend/django_service
python3 -m venv .venv && source .venv/bin/activate
pip install -r ../requirements-django.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

**FastAPI**
```bash
cd backend/fastapi_service
python3 -m venv .venv && source .venv/bin/activate
pip install -r ../requirements-fastapi.txt
uvicorn app.main:app --reload --port 8001
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

## Автоматические тесты

Проект сейчас покрыт интеграционными тестами для обоих backend-сервисов:

- `backend/django_service/core/tests/test_auth_and_agreements.py`
- `backend/django_service/core/tests/test_presets_and_admin.py`
- `backend/fastapi_service/tests/test_api_endpoints.py`
- `frontend/src/components/__tests__/CountryMultiSelect.test.jsx`
- `frontend/src/components/__tests__/IndicatorMultiSelect.test.jsx`
- `frontend/src/components/__tests__/ChartInsightAgent.test.jsx`
- `frontend/src/context/__tests__/AnalysisContext.test.jsx`

Запуск:

**Django tests**
```bash
cd backend/django_service
./.venv/bin/python manage.py test core.tests -v 2
```

**FastAPI tests**
```bash
cd backend/fastapi_service
./.venv/bin/python -m unittest discover -s tests -p "test_*.py" -v
```

**Frontend tests**
```bash
cd frontend
npm test
```

## Конфигурация (.env)

**Frontend**
- `VITE_DJANGO_URL` (по умолчанию `http://127.0.0.1:8000/api`)
- `VITE_FASTAPI_URL` (по умолчанию `http://127.0.0.1:8001/api/v1`)

**Django**
- `DJANGO_SECRET_KEY` (по умолчанию `dev-secret-key`)
- `DJANGO_DEBUG` (0/1)
- `DJANGO_ALLOWED_HOSTS` (через запятую)
- `DJANGO_DB_*` параметры, если нужна БД отличная от SQLite
- `DJANGO_THROTTLE_AUTH` (по умолчанию `20/min`) — rate limit для register/login/refresh
- `DJANGO_THROTTLE_AGREEMENTS` (по умолчанию `60/min`) — rate limit для accept agreement

**FastAPI**
- `DATABASE_URL` (по умолчанию `sqlite:///./fastapi.db`)
- `DJANGO_AUTH_URL` (по умолчанию `http://127.0.0.1:8000`)
- `DJANGO_SECRET_KEY` или `JWT_SECRET` (должен совпадать с Django для валидации JWT)
- `JWT_ALGORITHM` (по умолчанию `HS256`)
- `CORS_ALLOW_ORIGINS` (по умолчанию `http://localhost:5173,http://127.0.0.1:5173`)
- `AUTHZ_INTROSPECT_PATH` (по умолчанию `/api/auth/introspect`)
- `AUTHZ_CACHE_TTL_SECONDS` (по умолчанию `60`)
- `AUTHZ_INTROSPECT_TIMEOUT_SECONDS` (по умолчанию `3.5`)
- `AUTHZ_INTROSPECT_STRICT` (по умолчанию `1`; если `1`, protected endpoints fail-closed при недоступном Django)
- `RATE_LIMIT_ENABLED` (по умолчанию `1`)
- `RATE_LIMIT_RPS` (по умолчанию `5`)
- `RATE_LIMIT_BURST` (по умолчанию `20`)
- `CHART_EXPLAIN_PROVIDER` (по умолчанию `openai`; варианты: `openai`, `gemini`, `auto`)
- `OPENAI_API_KEY` (для провайдера `openai`; если не задан, AI agent вернет локальное аналитическое summary)
- `OPENAI_MODEL` (по умолчанию `gpt-4o-mini`)
- `OPENAI_BASE_URL` (по умолчанию `https://api.openai.com/v1`)
- `OPENAI_TIMEOUT_SECONDS` (по умолчанию `20`)
- `GEMINI_API_KEY` (для провайдера `gemini`)
- `GEMINI_MODEL` (по умолчанию `gemini-2.5-flash`)
- `GEMINI_BASE_URL` (по умолчанию `https://generativelanguage.googleapis.com/v1beta`)
- `CHART_EXPLAIN_MAX_COUNTRIES` (по умолчанию `4`)
- `CHART_EXPLAIN_MAX_INDICATORS` (по умолчанию `4`)

По умолчанию Django и FastAPI используют разные SQLite файлы. Если нужна общая БД, укажите одинаковый сервер/базу в Django и `DATABASE_URL` в FastAPI.

## Security model (важно)

- Django выдаёт JWT (SimpleJWT) с клеймами `role` и `agreement_accepted`.
- FastAPI использует тот же JWT для доступа к защищённым эндпойнтам (advanced analytics / forecast / ingestion).
- FastAPI:
  - валидирует JWT локально (по `DJANGO_SECRET_KEY`/`JWT_SECRET`)
  - запрашивает “живое” состояние авторизации (роль + принято ли соглашение) через Django `/api/auth/introspect` (с коротким кэшем), чтобы доступ корректно обновлялся сразу после принятия соглашения.

Примечание: в ветке market-ready (`feature/market-ready-platform`) будет включено серверное ограничение доступа к forecast/advanced analytics на основе принятого соглашения + rate limiting.

Для удобства настроек используйте `.env.example` в корне репозитория и создайте локальный `.env` с нужными значениями.

## (Опционально) Базовая загрузка индикаторов (FastAPI / ingestion)

Если нужно **сохранить данные в FastAPI БД** (кэширование/офлайн-режим), можно выполнить ingestion.

Требуется JWT с ролью `researcher` или `admin`.

1) Получите JWT с ролью researcher/admin из Django (`/api/auth/token`).
2) Запустите FastAPI сервис.
3) Запустите скрипт базовой загрузки:
```bash
cd backend/fastapi_service
python3 -m venv .venv && source .venv/bin/activate
pip install -r ../requirements-fastapi.txt
python scripts/ingest_baseline.py --token YOUR_JWT
```

Список базовых стран и индикаторов: `backend/fastapi_service/app/data/baseline.py`.
