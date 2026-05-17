# AI Architecture: RAG vs Fine-Tuning

## Overview

The AI Economic Mentor uses **Retrieval-Augmented Generation (RAG)** rather than fine-tuning. This document explains the design choice and the full architecture.

---

## Why RAG, Not Fine-Tuning

| Dimension | Fine-Tuning | RAG (our approach) |
|---|---|---|
| **Knowledge updates** | Requires retraining ($$$) | Edit a markdown file, restart |
| **Transparency** | Black box | Retrieved chunks are logged |
| **Hallucination risk** | High on out-of-distribution input | Grounded in retrieved context |
| **Cost** | GPU hours + API cost | Only inference cost |
| **Diploma defense** | Hard to explain internals | Clear, inspectable pipeline |

Fine-tuning bakes knowledge into model weights. If economic data changes (new GDP figures, policy shifts), the model must be retrained. RAG keeps knowledge in editable files and fetches relevant passages at query time — the model reasons over grounded context instead of memorized weights.

---

## Pipeline Architecture

```
User question
      │
      ▼
┌─────────────────────┐
│  RAG Retriever      │  sentence-transformers all-MiniLM-L6-v2
│  (rag.py)           │  cosine similarity over knowledge_base/*.md
└────────┬────────────┘
         │ top-4 chunks
         ▼
┌─────────────────────┐
│  Context Builder    │  rolling 6-msg history + chart data snapshot
│  (ai_mentor.py)     │  + retrieved chunks → system prompt
└────────┬────────────┘
         │ messages[]
         ▼
┌─────────────────────┐
│  LLM Inference      │  OpenRouter → meta-llama/llama-3.3-70b-instruct
│  (ai_mentor.py)     │  OpenAI-compatible /chat/completions
└────────┬────────────┘
         │ JSON response
         ▼
┌─────────────────────┐
│  Response Parser    │  { summary, insights[], limitations,
│  (ai_mentor.py)     │    suggested_next_steps[] }
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Session Memory     │  SQLAlchemy: AIConversation + AIMessage
│  (models.py)        │  user_id-scoped, persisted across sessions
└─────────────────────┘
```

---

## Knowledge Base

Nine curated markdown files in `knowledge_base/`:

| File | Content |
|---|---|
| `gdp.md` | GDP concepts, growth drivers, per-capita analysis |
| `inflation.md` | CPI, causes, monetary policy responses |
| `unemployment.md` | Types, natural rate, Okun's law |
| `gini_lorenz.md` | Inequality measurement, Lorenz curve interpretation |
| `trade_balance.md` | Exports/imports, current account, comparative advantage |
| `demographics.md` | Population growth, dependency ratios, aging |
| `chart_reading.md` | How to interpret time-series and comparison charts |
| `forecasting_limitations.md` | Why forecasts fail, confidence intervals |
| `indicator_relationships.md` | Phillips curve, GDP-unemployment, inflation-interest |

At startup the RAG service splits each file into ~300-word chunks with 50-word overlap, embeds them with `all-MiniLM-L6-v2`, and stores a normalized numpy matrix in memory. No vector database is required.

---

## API Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/ai/explain-chart` | Chart-attached question with dataset payload |
| `POST` | `/api/v1/ai/chat` | Free-form economic question |
| `POST` | `/api/v1/ai/suggest-next` | Generate 3 follow-up question suggestions |
| `POST` | `/api/v1/ai/report-summary` | Export conversation as markdown report |
| `GET` | `/api/v1/ai/conversations` | List user's conversation history |
| `GET` | `/api/v1/ai/conversations/{id}/messages` | Load messages for a conversation |
| `DELETE` | `/api/v1/ai/conversations/{id}` | Delete a conversation |
| `POST` | `/api/v1/ai/reindex` | Rebuild RAG index (staff/admin only) |

All endpoints require a valid JWT + accepted data agreement (enforced via `require_agreement` dependency).

---

## Structured Response Format

The LLM is prompted to return JSON:

```json
{
  "summary": "One-paragraph plain-language answer",
  "insights": ["Key insight 1", "Key insight 2", "Key insight 3"],
  "limitations": "What this analysis cannot tell us",
  "suggested_next_steps": ["Follow-up question A", "Follow-up question B"]
}
```

The frontend renders `insights` as a numbered list with an accent left border, `limitations` as italic fine print, and `suggested_next_steps` as clickable suggestion chips.

---

## Frontend Integration

Two surfaces consume the AI backend:

1. **Compare page (`ChartInsightAgent.jsx`)** — lightweight panel embedded in the analysis workspace. Sends full chart dataset, receives structured response. "Open in AI Mentor →" link transfers the user to the full experience.

2. **AI Mentor page (`/ai-mentor`, `AIMentorPage.jsx`)** — full-page ChatGPT-style interface with conversation sidebar, main chat area, and context panel showing attached countries/indicators.

Both surfaces share the same five sub-components: `SuggestionChips`, `ChatMessage`, `ConversationSidebar`, `ContextPanel`, `ReportModal`.
