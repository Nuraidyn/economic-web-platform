## The Lorenz Curve and the Gini Index Dashboard

Full-stack учебный проект дипломной тематики «Development of a Web Platform for Analyzing Income Inequality Using the Lorenz Curve and the Gini Index on the Example of Different Countries».  
Фронтенд (React + Vite + Tailwind + Chart.js) строит графики Lorenz/Gini и сравнения по странам. Бэкенд разделен на Django (аутентификация, роли, соглашения, админ) и FastAPI (ингест данных, аналитика, прогнозы).

Документация по архитектуре: `docs/architecture.md`.
План апгрейда до market-ready продукта: `docs/upgrade_plan.md` (ветка `feature/market-ready-platform`).

## Возможности

- Time-series сравнение индикаторов неравенства (Gini index, доли дохода по децилям/квинтилям) для нескольких стран.
- Lorenz Curve режим: фронтенд автоматически грузит квинтильные доли дохода (`SI.DST.*` индикаторы) и строит кривую Лоренца с линией абсолютного равенства.

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

## Конфигурация

**Frontend**
- `VITE_DJANGO_URL` (по умолчанию `http://127.0.0.1:8000/api`)
- `VITE_FASTAPI_URL` (по умолчанию `http://127.0.0.1:8001/api/v1`)

**Django**
- `DJANGO_SECRET_KEY` (по умолчанию `dev-secret-key`)
- `DJANGO_DEBUG` (0/1)
- `DJANGO_ALLOWED_HOSTS` (через запятую)
- `DJANGO_DB_*` параметры, если нужна БД отличная от SQLite

**FastAPI**
- `DATABASE_URL` (по умолчанию `sqlite:///./fastapi.db`)
- `DJANGO_AUTH_URL` (по умолчанию `http://127.0.0.1:8000`)
- `DJANGO_SECRET_KEY` или `JWT_SECRET` (должен совпадать с Django для валидации JWT)
- `JWT_ALGORITHM` (по умолчанию `HS256`)

По умолчанию Django и FastAPI используют разные SQLite файлы. Если нужна общая БД, укажите одинаковый сервер/базу в Django и `DATABASE_URL` в FastAPI.

## Security model (важно)

- Django выдаёт JWT (SimpleJWT) с клеймами `role` и `agreement_accepted`.
- FastAPI использует тот же JWT для доступа к защищённым эндпойнтам (analytics/forecast/ingestion).
- Для корректной валидации JWT **секрет в FastAPI** (`DJANGO_SECRET_KEY` или `JWT_SECRET`) должен совпадать с `DJANGO_SECRET_KEY` в Django.

Примечание: в ветке market-ready (`feature/market-ready-platform`) будет включено серверное ограничение доступа к forecast/advanced analytics на основе принятого соглашения + rate limiting.

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


