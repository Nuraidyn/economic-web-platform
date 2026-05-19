# EVision AI

**AI-powered economic analysis platform.** Compare macroeconomic indicators across countries, forecast trends, and get intelligent explanations — powered by LLM + RAG.

Supports three languages: **English · Русский · Қазақша**

---

## What Makes It AI

### AI Economic Mentor
A full ChatGPT-style interface for economic analysis. Ask anything about the data you're viewing — the AI answers with structured insights grounded in a curated economic knowledge base.

**How it works (RAG pipeline):**
```
Your question
     │
     ▼
RAG Retriever          sentence-transformers all-MiniLM-L6-v2
     │ top-4 chunks     cosine similarity over 9 economic knowledge files
     ▼
Context Builder        rolling 6-msg history + live chart data + retrieved chunks
     │
     ▼
LLM (Llama 3.3 70B)   via OpenRouter — OpenAI-compatible API
     │
     ▼
Structured response    { summary, insights[], limitations, suggested_next_steps[] }
```

RAG is chosen over fine-tuning: knowledge lives in editable markdown files, updates require no retraining, and retrieved chunks are fully transparent.

### Chart Insight Agent
Embedded in the analysis workspace — ask a question about any chart and receive an AI explanation using OpenAI (`gpt-4o-mini`) or Google Gemini (`gemini-2.5-flash`). Falls back to a local statistical summary if no API key is configured.

---

## Core Features

| Feature | Description |
|---|---|
| **Country comparison** | 30+ indicators (GDP, inflation, unemployment, trade, demographics) across any countries |
| **Forecasting** | Linear trend with 95% confidence intervals, backtest (MAE/RMSE), 1–20 year horizon |
| **Income inequality** | Lorenz curves, Gini coefficient, country rankings and trends over time |
| **AI Mentor** | Full conversational AI with session memory, follow-up suggestions, and report export |
| **Chart Insight** | Per-chart AI explanations inline with the analysis |
| **Saved presets** | Save and reload your analysis configurations |

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Chart.js |
| AI / LLM | OpenRouter (Llama 3.3 70B), OpenAI, Google Gemini, sentence-transformers |
| Analytics backend | FastAPI + SQLAlchemy |
| Auth backend | Django 4 + DRF + SimpleJWT |
| Database | PostgreSQL (Docker) / SQLite (local) |

---

## Architecture

Two backends with separate responsibilities:

```
                        React Frontend
                              │
              ┌───────────────┴───────────────┐
              │                               │
        Django :8000                    FastAPI :8001
        Auth · JWT · Presets            Analytics · Forecast
                                        AI Mentor · Chart Explain
              └───────────────┬───────────────┘
                              │
                         PostgreSQL
```

FastAPI validates JWTs by introspecting Django's `/api/auth/introspect` endpoint. All AI and analytics endpoints require a valid JWT + accepted data agreement.

---

## Quick Start

**Docker (recommended):**
```bash
cp .env.example .env
# Fill in your API keys
docker compose up -d --build
```

**Local dev:**
```bash
bash dev.sh
```

Services: Frontend `http://localhost:5173` · Django `http://127.0.0.1:8000/api` · FastAPI `http://127.0.0.1:8001/api/v1`

---

## Key Environment Variables

| Variable | Service | Purpose |
|---|---|---|
| `OPENROUTER_API_KEY` | FastAPI | LLM for AI Mentor (Llama 3.3 70B) |
| `OPENAI_API_KEY` | FastAPI | Chart explanations via GPT-4o-mini |
| `GEMINI_API_KEY` | FastAPI | Chart explanations via Gemini |
| `CHART_EXPLAIN_PROVIDER` | FastAPI | `openai` / `gemini` / `auto` |
| `DJANGO_SECRET_KEY` | Both | JWT signing secret — change in production |
| `DATABASE_URL` | FastAPI | SQLAlchemy URL (default: SQLite) |

See `.env.example` for the full list.

---

## AI Mentor Knowledge Base

Nine curated economic markdown files power the RAG retriever:

`gdp.md` · `inflation.md` · `unemployment.md` · `gini_lorenz.md` · `trade_balance.md` · `demographics.md` · `chart_reading.md` · `forecasting_limitations.md` · `indicator_relationships.md`

Each file is chunked (~300 words, 50-word overlap), embedded at startup with `all-MiniLM-L6-v2`, and stored as a normalized numpy matrix in memory — no vector database required. To update knowledge: edit a markdown file and restart FastAPI, or call `POST /api/v1/ai/reindex` (admin only).

---

## Running Tests

```bash
# Frontend
cd frontend && npm test

# Django
cd backend/django_service && python manage.py test core.tests

# FastAPI
cd backend/fastapi_service && python -m pytest tests/
```
