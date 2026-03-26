# Economic Web Platform

Полнофункциональная учебная платформа для сравнительного анализа и визуализации экономических индикаторов по странам. Поддерживает три языка интерфейса: русский, казахский, английский.

---

## Стек технологий

| Слой | Технологии |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Chart.js |
| Auth-бэкенд | Django 4 + DRF + SimpleJWT |
| Analytics-бэкенд | FastAPI + SQLAlchemy + Pydantic |
| База данных | PostgreSQL (Docker) / SQLite (локально) |
| AI-объяснение | OpenAI API / Google Gemini API / локальный fallback |
| Контейнеризация | Docker + docker-compose |

---

## Возможности платформы

- **Сравнение стран** — выбор нескольких стран и индикаторов, визуализация временных рядов через Chart.js (линейный, барный, scatter)
- **Неравенство** — кривые Лоренца, коэффициент Джини, тренды Gini по годам, рейтинг стран по Gini
- **Прогнозирование** — линейный тренд с доверительными интервалами (95%), бэктест на исторических данных (MAE/RMSE), горизонт 1–20 лет
- **AI-объяснение графиков** — отправка данных графика на бэкенд, ответ от OpenAI/Gemini, локальный статистический fallback
- **Пресеты** — сохранение, загрузка, удаление и перезапись настроек анализа (выбранные страны, индикаторы, тип графика, диапазон лет)
- **Аутентификация** — JWT-регистрация/логин, роли пользователей, пользовательское соглашение
- **Локализация** — RU / KZ / EN через собственный I18nContext
- **Тёмная тема** — переключение через ThemeContext

---

## Архитектура

### Двойной бэкенд

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│              (Vite, Tailwind, Chart.js)                 │
└──────────────────┬──────────────────┬───────────────────┘
                   │                  │
         /api/auth/*          /api/v1/*
         /api/agreements/*    /api/v1/forecast
         /api/presets/*       /api/v1/inequality/*
                   │          /api/v1/observations
                   │          /api/v1/analytics/*
                   ▼                  ▼
┌──────────────────────┐  ┌──────────────────────────────┐
│   Django (port 8000) │  │   FastAPI (port 8001)         │
│                      │  │                               │
│  - Регистрация/логин │  │  - Наблюдения (World Bank)   │
│  - JWT-выдача        │  │  - Lorenz / Gini              │
│  - Интроспекция JWT  │◄─│  - Корреляция                 │
│  - Соглашения        │  │  - Прогнозирование            │
│  - Пресеты           │  │  - AI-объяснение графиков     │
│  - Django Admin      │  │  - Rate limiting (per-IP)     │
└──────────────────────┘  └──────────────────────────────┘
           │                          │
           └────────────┬─────────────┘
                        ▼
              ┌──────────────────┐
              │   PostgreSQL /   │
              │     SQLite       │
              └──────────────────┘
```

**FastAPI не имеет собственной базы пользователей.** Он валидирует JWT локально, затем запрашивает актуальный контекст (роль + статус соглашения) через Django endpoint `/api/auth/introspect`. Результат кешируется на `AUTHZ_CACHE_TTL_SECONDS` (по умолчанию 60 сек).

### Поток аутентификации

```
1. Пользователь регистрируется/логинится → Django выдаёт JWT (access + refresh)
2. Frontend сохраняет токен, отправляет Authorization: Bearer <token>
3. FastAPI: локальная проверка подписи JWT → интроспекция Django
4. Если соглашение не принято → 403 Forbidden
5. Если Django недоступен и AUTHZ_INTROSPECT_STRICT=0 → fallback на JWT claims
```

---

## Структура проекта

```
economic-web-platform/
├── frontend/
│   └── src/
│       ├── api/
│       │   ├── analyticsApi.js       # Axios-клиент к FastAPI
│       │   ├── auth.js               # Axios-клиент к Django (auth, me, agreements)
│       │   ├── client.js             # Базовый Axios с interceptors
│       │   └── presets.js            # CRUD пресетов → Django
│       ├── components/
│       │   ├── AgreementPanel.jsx    # Форма принятия соглашения
│       │   ├── AuthModal.jsx         # Модалка входа/регистрации
│       │   ├── AuthPanel.jsx         # Форма логина/регистрации
│       │   ├── ChartDisplay.jsx      # Рендеринг Chart.js (line/bar/scatter)
│       │   ├── ChartInsightAgent.jsx # Отправка данных графика на AI-объяснение
│       │   ├── ComparisonDashboard.jsx # Основная панель сравнения стран
│       │   ├── CountryMultiSelect.jsx  # Мульти-выбор стран
│       │   ├── ForecastPanel.jsx     # Панель прогнозирования
│       │   ├── GiniTrendPanel.jsx    # График тренда Gini
│       │   ├── IndicatorMultiSelect.jsx # Мульти-выбор индикаторов
│       │   ├── Navbar.jsx            # Навигация + язык + тема + auth
│       │   └── SavedPresetsPanel.jsx # Сохранение/загрузка пресетов
│       ├── context/
│       │   ├── AnalysisContext.jsx   # Глобальное состояние анализа (страны, индикаторы, годы)
│       │   ├── AuthContext.jsx       # Состояние аутентификации и пользователя
│       │   ├── I18nContext.jsx       # Локализация (ru/kz/en)
│       │   └── ThemeContext.jsx      # Тёмная/светлая тема
│       ├── data/
│       │   └── indicatorCatalog.js  # Каталог индикаторов (коды, названия, единицы)
│       ├── layouts/
│       │   └── AppLayout.jsx        # Обёртка с Navbar
│       └── pages/
│           ├── Home.jsx             # Главная: сравнение стран
│           ├── Inequality.jsx       # Страница неравенства (Lorenz/Gini)
│           ├── Forecast.jsx         # Страница прогнозов
│           └── Saved.jsx            # Страница пресетов
│
├── backend/
│   ├── django_service/
│   │   ├── config/
│   │   │   ├── settings.py          # Настройки Django
│   │   │   ├── urls.py              # Корневые URL
│   │   │   └── simple_cors.py       # Кастомный CORS middleware
│   │   └── core/
│   │       ├── models.py            # UserAgreement, AgreementAcceptance, UserProfile, AnalysisPreset
│   │       ├── views.py             # RegisterView, LoginView, MeView, IntrospectView, PresetsView
│   │       ├── serializers.py       # DRF-сериализаторы
│   │       ├── tokens.py            # Кастомный JWT (роль + agreement_accepted в claims)
│   │       ├── permissions.py       # IsResearcher, IsAdmin
│   │       ├── signals.py           # Автосоздание UserProfile при создании User
│   │       ├── utils.py             # get_active_agreement, has_accepted_active_agreement
│   │       ├── admin.py             # Регистрация моделей в Django Admin
│   │       └── tests/
│   │           ├── test_auth_and_agreements.py
│   │           └── test_presets_and_admin.py
│   │
│   ├── fastapi_service/
│   │   ├── app/
│   │   │   ├── main.py              # FastAPI app, middleware, роутеры
│   │   │   ├── db.py                # SQLAlchemy engine, SessionLocal, Base
│   │   │   ├── deps.py              # Dependency injection: get_token, get_jwt_payload, require_agreement
│   │   │   ├── schemas.py           # Pydantic модели запросов/ответов
│   │   │   ├── models.py            # Country, Indicator, Observation (ORM)
│   │   │   ├── models_analytics.py  # LorenzResult (кеш кривых Лоренца)
│   │   │   ├── models_forecast.py   # ForecastRun, ForecastPoint
│   │   │   ├── models_ingestion.py  # IngestionRun (история загрузок)
│   │   │   ├── api/v1/
│   │   │   │   ├── observations.py  # GET /observations (данные по стране+индикатору)
│   │   │   │   ├── analytics.py     # GET /lorenz, /gini, /correlation; POST /analytics/chart/explain
│   │   │   │   ├── inequality.py    # GET /inequality/gini/trend, /inequality/gini/ranking
│   │   │   │   ├── forecast.py      # POST /forecast, GET /forecast/latest
│   │   │   │   ├── ingestion.py     # POST /ingest (загрузка данных из World Bank)
│   │   │   │   ├── ingestion_runs.py # GET /ingestion-runs
│   │   │   │   ├── catalog.py       # GET /countries, /indicators
│   │   │   │   ├── health.py        # GET /health
│   │   │   │   └── params.py        # Типизированные параметры запросов
│   │   │   ├── core/
│   │   │   │   ├── config.py        # Все конфиги через os.getenv
│   │   │   │   └── security.py      # verify_jwt (HS256)
│   │   │   ├── middleware/
│   │   │   │   └── rate_limit.py    # Token-bucket rate limiter (per-IP, in-memory)
│   │   │   └── services/
│   │   │       ├── analytics.py     # Lorenz/Gini вычисления и кеширование
│   │   │       ├── authz.py         # Интроспекция Django, кеш AuthzContext
│   │   │       ├── chart_explainer.py # OpenAI/Gemini/local-fallback
│   │   │       ├── correlation.py   # Коэффициент Пирсона
│   │   │       ├── forecasting.py   # Линейный тренд, winsorize, backtest
│   │   │       ├── ingestion.py     # Сохранение данных в БД
│   │   │       └── world_bank.py    # HTTP-запросы к World Bank API
│   │   ├── scripts/
│   │   │   └── ingest_baseline.py   # Скрипт загрузки начальных данных
│   │   └── tests/
│   │       └── test_api_endpoints.py
│   │
│   └── shared/
│       └── constants.py             # Общие константы (MIN/MAX_SAFE_YEAR)
│
├── docker-compose.yml
├── dev.sh                           # Локальный запуск всех сервисов с авто-определением портов
├── .env.example                     # Шаблон переменных окружения
└── CLAUDE.md                        # Инструкции для Claude Code
```

---

## API-эндпоинты

### Django (`http://127.0.0.1:8000/api`)

| Метод | URL | Доступ | Описание |
|---|---|---|---|
| POST | `/auth/register/` | Публичный | Регистрация |
| POST | `/auth/token/` | Публичный | Логин, получение JWT |
| POST | `/auth/token/refresh/` | Публичный | Обновление access-токена |
| GET | `/auth/me/` | JWT | Профиль текущего пользователя |
| GET | `/auth/introspect/` | JWT | Роль + статус соглашения (для FastAPI) |
| GET | `/agreements/active/` | Публичный | Активное пользовательское соглашение |
| POST | `/agreements/accept/` | JWT | Принять соглашение |
| GET/POST | `/presets/` | JWT | Список / создание пресетов |
| GET/PUT/DELETE | `/presets/<id>/` | JWT | Один пресет |

### FastAPI (`http://127.0.0.1:8001/api/v1`)

| Метод | URL | Доступ | Описание |
|---|---|---|---|
| GET | `/health` | Публичный | Health check |
| GET | `/countries` | Публичный | Каталог стран |
| GET | `/indicators` | Публичный | Каталог индикаторов |
| GET | `/observations` | JWT + Соглашение | Данные по стране+индикатору (DB или World Bank) |
| GET | `/lorenz` | JWT + Соглашение | Кривая Лоренца (country, year) |
| GET | `/gini` | JWT + Соглашение | Коэффициент Джини (country, year) |
| GET | `/correlation` | JWT + Соглашение | Корреляция двух индикаторов |
| POST | `/analytics/chart/explain` | JWT + Соглашение | AI-объяснение графика |
| GET | `/inequality/gini/trend` | JWT + Соглашение | Тренд Gini по годам |
| GET | `/inequality/gini/ranking` | JWT + Соглашение | Рейтинг стран по Gini |
| POST | `/forecast` | JWT + Соглашение | Создать прогноз (linear_trend) |
| GET | `/forecast/latest` | JWT + Соглашение | Последний сохранённый прогноз |
| POST | `/ingest` | JWT + роль researcher/admin | Загрузка данных из World Bank |
| GET | `/ingestion-runs` | JWT | История запусков ingestion |

---

## Модели данных

### Django

```
UserProfile         — OneToOne с User; поля: role (guest/user/researcher/admin)
UserAgreement       — version, title, content, is_active, published_at
AgreementAcceptance — user FK, agreement FK, accepted_at, ip_address
AnalysisPreset      — user FK, name, payload (JSON), created_at, updated_at
```

### FastAPI (SQLAlchemy)

```
Country             — code (PK), name
Indicator           — code (PK), name, source, unit, description
Observation         — country FK, indicator FK, year, value
LorenzResult        — country FK, year, points_json, gini (кеш вычислений)
ForecastRun         — country FK, indicator FK, model_name, horizon_years, assumptions, metrics
ForecastPoint       — run FK, year, value, lower, upper (доверительный интервал)
IngestionRun        — source, country_code, indicator_code, status, inserted, total, missing, error
```

---

## Алгоритмы и бизнес-логика

### Кривая Лоренца и Gini

Используются 5 индикаторов World Bank (доли дохода квинтилей): `SI.DST.FRST.20` – `SI.DST.05TH.20`. Кривая строится методом накопленных долей. Gini = 1 − 2 × площадь под кривой Лоренца (метод трапеций). Результат кешируется в `LorenzResult`.

### Прогнозирование

1. Берутся исторические данные (до 25 последних точек)
2. Winsorize на 5-м и 95-м перцентиле (защита от выбросов)
3. Линейный тренд `numpy.polyfit(x, y, deg=1)`
4. Прогноз на `horizon_years` вперёд
5. Доверительный интервал: `±1.96 × std_residuals`
6. Rolling-origin бэктест (MAE, RMSE) на последних 5 точках

### AI-объяснение графиков

1. Строится текстовое резюме графика (статистика по каждой серии: тренд, мин/макс, изменение, %)
2. Отправляется запрос к OpenAI (`gpt-4o-mini`) или Gemini (`gemini-2.5-flash`)
3. Если API недоступен — возвращается локальный статистический ответ на нужном языке (ru/kz/en)
4. Провайдер выбирается через `CHART_EXPLAIN_PROVIDER` (`openai`/`gemini`/`auto`)

### Rate Limiting

Token-bucket алгоритм, in-memory, per-IP. По умолчанию: 5 RPS, burst 20. Ограничивает только пути `/api/*`. Для multi-worker деплоя рекомендуется заменить на Redis-реализацию.

---

## Быстрый старт

### Docker (рекомендуется)

```bash
cp .env.example .env
# Заполните .env своими ключами
docker compose up -d --build
```

Сервисы:
- Frontend: `http://localhost:5173`
- Django API: `http://127.0.0.1:8000/api`
- FastAPI API: `http://127.0.0.1:8001/api/v1`

Остановить: `docker compose down`

### dev.sh (локально, авто-определение портов)

```bash
bash dev.sh
```

Для Windows используйте WSL или Git Bash.

### Ручной запуск по сервисам

**Django:**
```bash
cd backend/django_service
python -m venv .venv
source .venv/bin/activate      # Linux/macOS
# .venv\Scripts\activate       # Windows
pip install -r ../requirements-django.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

**FastAPI:**
```bash
cd backend/fastapi_service
python -m venv .venv
source .venv/bin/activate
pip install -r ../requirements-fastapi.txt
uvicorn app.main:app --reload --port 8001
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## Переменные окружения

Создайте `.env` в корне проекта (или используйте `.env.example` как шаблон).

### Frontend

| Переменная | По умолчанию | Описание |
|---|---|---|
| `VITE_DJANGO_URL` | `http://127.0.0.1:8000/api` | URL Django API |
| `VITE_FASTAPI_URL` | `http://127.0.0.1:8001/api/v1` | URL FastAPI |

### Django

| Переменная | По умолчанию | Описание |
|---|---|---|
| `DJANGO_SECRET_KEY` | `dev-secret-key` | Секретный ключ (обязательно сменить в prod) |
| `DJANGO_DEBUG` | `0` | Debug-режим (`1` или `0`) |
| `DJANGO_ALLOWED_HOSTS` | `*` | Разрешённые хосты |
| `DJANGO_DB_ENGINE` | SQLite | `django.db.backends.postgresql` для PostgreSQL |
| `DJANGO_DB_NAME/USER/PASSWORD/HOST/PORT` | — | Настройки PostgreSQL |
| `DJANGO_CORS_ALLOWED_ORIGINS` | — | Разрешённые CORS origins |
| `DJANGO_THROTTLE_AUTH` | `20/min` | Rate limit для auth-эндпоинтов |
| `DJANGO_THROTTLE_AGREEMENTS` | `10/min` | Rate limit для agreements |

### FastAPI

| Переменная | По умолчанию | Описание |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./fastapi.db` | SQLAlchemy URL |
| `DJANGO_AUTH_URL` | `http://127.0.0.1:8000` | URL Django (для интроспекции) |
| `DJANGO_SECRET_KEY` / `JWT_SECRET` | `dev-secret-key` | Секрет для валидации JWT |
| `JWT_ALGORITHM` | `HS256` | Алгоритм JWT |
| `CORS_ALLOW_ORIGINS` | `http://localhost:5173,...` | Разрешённые CORS origins |
| `AUTHZ_INTROSPECT_STRICT` | `1` | Если `1` — закрывает эндпоинты при недоступности Django |
| `AUTHZ_CACHE_TTL_SECONDS` | `60` | Кеш результата интроспекции (секунды) |
| `AUTHZ_INTROSPECT_TIMEOUT_SECONDS` | `3.5` | Таймаут запроса к Django |
| `RATE_LIMIT_ENABLED` | `1` | Включить rate limiting |
| `RATE_LIMIT_RPS` | `5` | Запросов в секунду |
| `RATE_LIMIT_BURST` | `20` | Burst-лимит |
| `CHART_EXPLAIN_PROVIDER` | `openai` | `openai` / `gemini` / `auto` |
| `OPENAI_API_KEY` | — | Ключ OpenAI |
| `OPENAI_MODEL` | `gpt-4o-mini` | Модель OpenAI |
| `OPENAI_TIMEOUT_SECONDS` | `20` | Таймаут запроса к OpenAI |
| `GEMINI_API_KEY` | — | Ключ Google Gemini |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Модель Gemini |
| `GEMINI_TIMEOUT_SECONDS` | `20` | Таймаут запроса к Gemini |
| `CHART_EXPLAIN_MAX_COUNTRIES` | `4` | Макс. стран на объяснение |
| `CHART_EXPLAIN_MAX_INDICATORS` | `4` | Макс. индикаторов на объяснение |

---

## Тесты

### Frontend (Vitest)
```bash
cd frontend
npm test           # однократный запуск
npm run test:watch # watch-режим
npm run lint       # ESLint (zero warnings)
```

### Django
```bash
cd backend/django_service
python manage.py test core.tests -v 2
```

Тесты покрывают:
- Регистрацию, логин, refresh, интроспекцию
- Принятие соглашений, проверку доступа
- CRUD пресетов, конфликт имён (409)
- Права ролей в Admin

### FastAPI
```bash
cd backend/fastapi_service
python -m unittest discover -s tests -p "test_*.py" -v
# или
python -m pytest tests/
```

---

## Загрузка начальных данных (Ingestion)

Данные можно загрузить вручную через скрипт или API-эндпоинт (требуется JWT с ролью `researcher` или `admin`):

```bash
cd backend/fastapi_service
python scripts/ingest_baseline.py --token YOUR_JWT
```

Либо через POST `/api/v1/ingest`:
```json
{
  "country": "KZ",
  "indicator": "NY.GDP.MKTP.CD",
  "start_year": 2000,
  "end_year": 2023
}
```

Данные загружаются из World Bank API и кешируются в базе FastAPI. Повторные запросы к `/observations` используют кеш.

---

## Модель безопасности

1. **JWT содержат claims:** `user_id`, `role`, `agreement_accepted`
2. **FastAPI** всегда интроспектирует Django для актуального состояния (роль/соглашение не берётся только из токена)
3. **Все аналитические эндпоинты** (`/observations`, `/lorenz`, `/gini`, `/correlation`, `/forecast`, `/inequality/*`, `/analytics/chart/explain`) требуют действующий JWT + принятое соглашение (`require_agreement`)
4. **`AUTHZ_INTROSPECT_STRICT=1`** — при недоступности Django любой защищённый эндпоинт возвращает 503, а не работает на доверии к токену
5. **Rate limiting** защищает от перегрузки (по умолчанию 5 RPS с burst 20 на IP)

---

## Что было исправлено

| Файл | Проблема | Исправление |
|---|---|---|
| `fastapi_service/app/api/v1/observations.py` | Эндпоинт `/observations` не требовал авторизации и принятия соглашения — данные были доступны без аутентификации | Добавлен `_: dict = Depends(require_agreement)` |
| `fastapi_service/app/api/v1/analytics.py` | POST `/analytics/chart/explain` также не имел проверки авторизации | Добавлен `_: dict = Depends(require_agreement)` |
| `fastapi_service/app/core/config.py` | Отсутствовала переменная `GEMINI_TIMEOUT_SECONDS` | Добавлена переменная с дефолтом `20` |
| `fastapi_service/app/services/chart_explainer.py` | Функция `_gemini_answer` использовала `OPENAI_TIMEOUT_SECONDS` (copy-paste ошибка) | Исправлено на `GEMINI_TIMEOUT_SECONDS` |
| `frontend/src/context/AuthContext.jsx` | Функции `login`, `register`, `logout`, `acceptActiveAgreement` не были обёрнуты в `useCallback` — пересоздавались на каждый рендер, `useMemo` никогда не кешировал контекст | Все четыре функции обёрнуты в `useCallback([])` |