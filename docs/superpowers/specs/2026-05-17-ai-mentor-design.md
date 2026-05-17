# AI Economic Mentor — Design Spec

**Date:** 2026-05-17  
**Status:** Approved  
**Approach:** Option A — Monolithic AI Service

---

## Overview

Upgrade the existing single-shot chart explanation into a full AI Economic Mentor. Two AI experiences exist simultaneously:

1. **Compare Page AI Agent** — improved UX, structured responses, suggestion chips, stays embedded in the Compare page.
2. **AI Mentor Page (`/ai-mentor`)** — full-page ChatGPT-style interface with conversation history, RAG, and session memory.

Neither replaces the other. Both share the same backend AI service.

---

## 1. Data Models

Two new SQLAlchemy models added to `backend/fastapi_service/app/models.py`.

### `AIConversation`
| Column | Type | Notes |
|---|---|---|
| `id` | Integer PK | |
| `user_id` | Integer | Django user ID (not FK — cross-service) |
| `title` | String(200) | Auto-generated from first user message (first 80 chars) |
| `context_snapshot` | JSON | Last known chart context: countries, indicators, year range, datasets |
| `created_at` | DateTime | |
| `updated_at` | DateTime | Updated on every new message |

### `AIMessage`
| Column | Type | Notes |
|---|---|---|
| `id` | Integer PK | |
| `conversation_id` | Integer FK → AIConversation | |
| `role` | String(20) | `user` or `assistant` |
| `content` | Text | Full message text |
| `rag_chunks_used` | JSON nullable | Chunk texts retrieved for this response |
| `structured_response` | JSON nullable | `{summary, insights[], limitations, suggested_next_steps[]}` |
| `created_at` | DateTime | |

Uses the existing FastAPI SQLAlchemy database (SQLite in dev, PostgreSQL in Docker).

---

## 2. RAG Pipeline

### Knowledge Base
`knowledge_base/` at project root. Nine markdown files:

| File | Topic |
|---|---|
| `gdp.md` | GDP definition, nominal vs. real, PPP, growth interpretation |
| `inflation.md` | CPI/PPI, hyperinflation, disinflation, inflation–rate relationship |
| `unemployment.md` | Types, natural rate, Okun's Law, youth unemployment |
| `gini_lorenz.md` | Lorenz curve, Gini coefficient, interpretation, limitations |
| `trade_balance.md` | Current account, surplus/deficit, terms of trade |
| `demographics.md` | Population growth, dependency ratio, aging economies |
| `chart_reading.md` | Time-series reading, anomalies, correlation vs. causation |
| `forecasting_limitations.md` | Why forecasts fail, confidence intervals, model assumptions |
| `indicator_relationships.md` | Phillips curve, Kuznets curve, GDP-Gini paradox |

### `app/services/rag.py`
- **Startup indexing**: reads all `.md` files, splits into ~300-token chunks with 50-token overlap, embeds with `sentence-transformers` `all-MiniLM-L6-v2`, stores as in-memory numpy array + metadata list.
- **Retrieval**: `retrieve(query: str, top_k: int = 4) -> list[str]` — embed query, cosine similarity, return top-k chunk texts.
- **No vector DB dependency** — pure numpy, fast enough for 9 files.
- Index rebuilt at startup via FastAPI `lifespan` event. Rebuild takes ~2-3 seconds.
- `POST /api/v1/ai/reindex` (staff-only) triggers manual rebuild.

---

## 3. AI Mentor Service (`app/services/ai_mentor.py`)

Single service module handling all four endpoint flows.

### OpenRouter Provider
```
OPENROUTER_API_KEY    (required)
OPENROUTER_MODEL      default: meta-llama/llama-3.3-70b-instruct:free
OPENROUTER_BASE_URL   default: https://openrouter.ai/api/v1
```
Uses OpenAI-compatible `/chat/completions` API. Added alongside existing providers in `config.py`.

### System Prompt
> "You are an AI Economic Mentor embedded in an economic analytics platform. You have access to a knowledge base of economic concepts and the user's chart data. Be precise, cite data when available, acknowledge uncertainty. Always respond in {language}."

### LLM Context Window (per call)
1. System prompt
2. RAG chunks (top-4, formatted as `[Knowledge Base]\n{chunk}`)
3. Chart context summary (if available, reuses `_build_data_summary`)
4. Last 6 messages from conversation history (rolling window)
5. Current user message

### Four Service Functions

**`explain_chart(user_id, conversation_id, payload, db)`**
- Build data summary from chart datasets
- Retrieve 4 RAG chunks for indicator names
- Load last 6 messages from conversation
- Call LLM → parse structured response
- Store user message + assistant message in DB
- Return `StructuredAIResponse`

**`chat(user_id, conversation_id, message, context_snapshot, language, db)`**
- Retrieve 4 RAG chunks for user message
- Load last 6 messages
- Inject context_snapshot if present
- Call LLM → parse structured response
- Store both messages in DB
- Auto-generate conversation title from first user message if new

**`suggest_next(user_id, conversation_id, context_snapshot, language, db)`**
- Load last 4 messages + context
- Ask LLM to return JSON array of 3-5 follow-up questions
- Parse JSON response, return as `list[str]`
- Not stored as conversation messages

**`report_summary(user_id, conversation_id, context_snapshot, language, db)`**
- Load full conversation history
- Ask LLM to generate a structured markdown report with sections: Executive Summary, Key Findings, Indicator Analysis, Limitations, Recommendations
- Store as special assistant message
- Return markdown string + message_id

### Structured Response Format
All LLM calls for chat/explain use this JSON schema in the prompt:
```json
{
  "summary": "one-sentence summary",
  "insights": ["bullet 1", "bullet 2", "bullet 3"],
  "limitations": "caveats or data gaps",
  "suggested_next_steps": ["question 1", "question 2"]
}
```
If LLM returns non-JSON, the full text is placed in `summary` with empty arrays for other fields.

---

## 4. API Endpoints

New router `app/api/v1/ai.py`, mounted at `/api/v1/ai`. All endpoints except `reindex` require `require_agreement` (logged-in + agreement accepted).

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/ai/explain-chart` | Chart-aware explanation, structured response |
| `POST` | `/api/v1/ai/chat` | General mentor chat |
| `POST` | `/api/v1/ai/suggest-next` | Returns 3-5 suggestion chips |
| `POST` | `/api/v1/ai/report-summary` | Generates full markdown report |
| `GET` | `/api/v1/ai/conversations` | Lists user's conversations |
| `GET` | `/api/v1/ai/conversations/{id}/messages` | Full message history |
| `DELETE` | `/api/v1/ai/conversations/{id}` | Delete conversation |
| `POST` | `/api/v1/ai/reindex` | Rebuild RAG index (staff only) |

### Request/Response Shapes

**`POST /explain-chart`**
```
Request:  ChartExplainRequest + { conversation_id?: int }
Response: { conversation_id, message_id, summary, insights[], limitations,
            suggested_next_steps[], provider, model, rag_chunks_used[] }
```

**`POST /chat`**
```
Request:  { conversation_id?: int, message: str, context_snapshot?: object, language: str }
Response: { conversation_id, message_id, summary, insights[], limitations,
            suggested_next_steps[], provider, model }
```

**`POST /suggest-next`**
```
Request:  { conversation_id?: int, context_snapshot?: object, language: str }
Response: { suggestions: str[] }
```

**`POST /report-summary`**
```
Request:  { conversation_id: int, context_snapshot?: object, language: str }
Response: { report_markdown: str, message_id: int }
```

The existing `POST /api/v1/analytics/chart/explain` is kept for backwards compatibility. The Compare page will migrate to the new endpoint.

---

## 5. Frontend: Improved Compare Page AI Agent

File: `frontend/src/components/ChartInsightAgent.jsx` (updated in-place)

**Changes:**
- On mount (after datasets load), calls `suggest-next` to populate initial suggestion chips
- Clicking a chip fills the textarea
- After each answer, fetches new suggestion chips
- Structured response rendering: `summary` as lead paragraph, `insights[]` as bullet list, `limitations` as muted italic footnote, `suggested_next_steps[]` as clickable chips
- "Generate Report" button → calls `report-summary` → opens `ReportModal`
- Maintains `conversation_id` in local state (created on first question, reused for session)
- "Open in AI Mentor →" link passes `conversation_id` as query param to `/ai-mentor`
- Animated thinking dots during loading + per-section skeletons
- Auth/agreement gates unchanged
- Calls `POST /api/v1/ai/explain-chart` instead of old endpoint

---

## 6. Frontend: AI Mentor Page

**Route:** `/ai-mentor` added to `App.jsx`  
**Navbar:** "AI Mentor" link added

### Layout (three-column)

```
┌─────────────────────────────────────────────────────┐
│ [Sidebar 240px]  [Main Chat flex-1]  [Context 280px] │
│                                                       │
│ + New Chat       ┌────────────────┐  Countries:       │
│                  │  message list  │  [KZ] [DE]        │
│ > Chat 1         │                │                   │
│   Chat 2         │                │  Indicators:      │
│   Chat 3         │                │  GDP, Inflation   │
│                  │                │                   │
│                  ├────────────────┤  Years: 2000-2024 │
│                  │ [chips row]    │                   │
│                  │ [textarea]  ▶  │  [Clear context]  │
│                  └────────────────┘                   │
└─────────────────────────────────────────────────────┘
```

### New Files
```
frontend/src/pages/AIMentorPage.jsx
frontend/src/api/aiMentorApi.js
frontend/src/components/ai-mentor/ChatMessage.jsx
frontend/src/components/ai-mentor/ConversationSidebar.jsx
frontend/src/components/ai-mentor/ContextPanel.jsx
frontend/src/components/ai-mentor/SuggestionChips.jsx
frontend/src/components/ai-mentor/ReportModal.jsx
```

### Message Rendering (`ChatMessage.jsx`)
- User: right-aligned bubble, muted background
- Assistant: left-aligned, surface background, structured:
  - Bold `summary`
  - Numbered `insights[]` with left accent border
  - Italic muted `limitations`
  - `suggested_next_steps[]` as clickable chips

### Empty State
Centered "Your personal economic research assistant." with 4 example question cards:
- "Why does GDP grow while inequality increases?"
- "Compare Kazakhstan and Germany economically."
- "What indicators should I analyze together?"
- "Explain the relationship between inflation and unemployment."

### Input Area
- Auto-growing textarea (max 4 lines), Ctrl+Enter to send
- Suggestion chips row above input
- Language selector (EN/RU/KZ)
- "Generate Report" button appears when conversation has ≥3 messages

### Context Injection
If `/ai-mentor?conversation_id=X` → load that conversation.  
If `/ai-mentor?context=...` → pre-populate context panel from Compare page.

---

## 7. Knowledge Base & Docs

### `knowledge_base/*.md`
Nine files listed in Section 2. Each ~400-600 words, factual reference material.

### `docs/ai-architecture.md`
Explains:
- Why RAG instead of fine-tuning
- How the embedding index works
- How session memory works
- Full data flow diagram (text)
- Why OpenRouter (multi-model, OpenAI-compatible, no vendor lock-in)

---

## File Inventory

### New Backend Files
```
backend/fastapi_service/app/services/rag.py
backend/fastapi_service/app/services/ai_mentor.py
backend/fastapi_service/app/api/v1/ai.py
```

### Modified Backend Files
```
backend/fastapi_service/app/models.py          (+ AIConversation, AIMessage)
backend/fastapi_service/app/core/config.py     (+ OpenRouter config)
backend/fastapi_service/app/main.py            (+ mount ai router, lifespan index build)
backend/fastapi_service/app/deps.py            (+ require_staff dependency)
backend/fastapi_service/requirements.txt       (+ sentence-transformers, numpy)
```

### New Frontend Files
```
frontend/src/pages/AIMentorPage.jsx
frontend/src/api/aiMentorApi.js
frontend/src/components/ai-mentor/ChatMessage.jsx
frontend/src/components/ai-mentor/ConversationSidebar.jsx
frontend/src/components/ai-mentor/ContextPanel.jsx
frontend/src/components/ai-mentor/SuggestionChips.jsx
frontend/src/components/ai-mentor/ReportModal.jsx
```

### Modified Frontend Files
```
frontend/src/App.jsx                           (+ /ai-mentor route)
frontend/src/components/ChartInsightAgent.jsx  (UX overhaul + new endpoints)
frontend/src/layouts/AppLayout.jsx             (+ AI Mentor nav link)
```

### New Root Files
```
knowledge_base/gdp.md
knowledge_base/inflation.md
knowledge_base/unemployment.md
knowledge_base/gini_lorenz.md
knowledge_base/trade_balance.md
knowledge_base/demographics.md
knowledge_base/chart_reading.md
knowledge_base/forecasting_limitations.md
knowledge_base/indicator_relationships.md
docs/ai-architecture.md
```

---

## Dependencies to Add

**Python (`requirements.txt`):**
```
sentence-transformers>=3.0.0
numpy>=1.26.0
```

**Frontend:** No new npm packages — uses existing Axios, React, Tailwind.

---

## Auth Enforcement Summary

| Endpoint group | Requirement |
|---|---|
| All `/api/v1/ai/*` except `reindex` | Valid JWT + `agreement_accepted=true` |
| `POST /api/v1/ai/reindex` | Valid JWT + `is_staff=true` |
| Frontend AI Mentor page | Auth gate in `AIMentorPage.jsx` (redirect to login if unauthenticated) |
| Frontend ChartInsightAgent | Existing auth/agreement gates preserved |
