import React, { useEffect, useRef, useState } from "react";

import { fetchIncomeChat } from "../../api/analyticsApi";
import { useI18n } from "../../context/I18nContext";

const PROVIDER_LABELS = {
  openai:   "OpenAI",
  gemini:   "Gemini",
  groq:     "Groq",
  fallback: "Offline",
};

const STARTER_QUESTIONS = {
  en: [
    "Am I saving enough each month?",
    "How can I grow my income faster?",
    "Which countries pay more for my profession?",
    "How long until I can build a 6-month emergency fund?",
    "What should I focus on in the next 3 months?",
  ],
  ru: [
    "Достаточно ли я откладываю каждый месяц?",
    "Как быстрее увеличить доход?",
    "В каких странах платят больше по моей специальности?",
    "Сколько времени займёт создать финансовую подушку на 6 месяцев?",
    "На что сосредоточиться в ближайшие 3 месяца?",
  ],
  kz: [
    "Мен ай сайын жеткілікті жинап жатырмын ба?",
    "Табысымды қалай тезірек арттыруға болады?",
    "Мамандығым үшін қай елдерде көбірек төлейді?",
    "6 айлық қаржылық жастық жасауға қанша уақыт кетеді?",
    "Келесі 3 айда неге назар аудару керек?",
  ],
};

function ProviderBadge({ provider }) {
  if (!provider || provider === "fallback") return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{
        background: "color-mix(in srgb, var(--accent) 12%, transparent)",
        color: "color-mix(in srgb, var(--accent) 90%, var(--text))",
        border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
      {PROVIDER_LABELS[provider] ?? provider}
    </span>
  );
}

function TypingDots() {
  return (
    <div className="flex justify-start">
      <div
        className="rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center"
        style={{ background: "var(--surface)" }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function FinancialAdvisorChat({ formData }) {
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState(null);
  const abortRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const starters = STARTER_QUESTIONS[lang] || STARTER_QUESTIONS.en;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text) {
    const trimmed = (text ?? input).trim();
    if (!trimmed || loading) return;

    const userMsg = { role: "user", content: trimmed };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const payload = {
        profile: {
          age: formData.age,
          country: formData.country,
          profession: formData.profession,
          experience_years: formData.experienceYears,
          monthly_income: formData.monthlyIncome,
          monthly_expenses: formData.monthlyExpenses,
          yearly_growth_percent: formData.growthPct ?? 0,
          currency: formData.currency ?? "USD",
        },
        messages: history,
        language: lang,
      };
      const data = await fetchIncomeChat(payload, abortRef.current.signal);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      setProvider(data.provider);
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t("incomeAnalysis.chatError") },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="panel-wide space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="page-section-kicker">{t("incomeAnalysis.chatTitle")}</span>
          <p className="text-xs text-muted mt-1">{t("incomeAnalysis.chatSubtitle")}</p>
        </div>
        {provider && <ProviderBadge provider={provider} />}
      </div>

      {/* Messages area */}
      <div
        className="rounded-xl border border-[var(--panel-border)] overflow-y-auto"
        style={{
          height: "380px",
          background: "var(--canvas)",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {isEmpty ? (
          /* Empty state with starter chips */
          <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center">
            <div
              style={{
                width: "3rem", height: "3rem",
                borderRadius: "var(--r-lg)",
                background: "var(--accent-dim)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--accent)",
                fontSize: "1.25rem",
              }}
            >
              💬
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">{t("incomeAnalysis.chatEmptyTitle")}</p>
              <p className="text-xs text-muted max-w-xs">{t("incomeAnalysis.chatEmpty")}</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {starters.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--panel-border-strong)",
                    borderRadius: "var(--r-md)",
                    color: "var(--text)",
                    fontSize: "0.8rem",
                    lineHeight: "1.4",
                    padding: "0.375rem 0.75rem",
                    cursor: "pointer",
                    transition: "border-color 0.15s, background 0.15s",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--panel-border-strong)"; }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] text-sm leading-relaxed px-4 py-2.5 ${
                    msg.role === "user"
                      ? "rounded-2xl rounded-tr-sm"
                      : "rounded-2xl rounded-tl-sm"
                  }`}
                  style={{
                    background: msg.role === "user"
                      ? "var(--tab-active-bg)"
                      : "var(--surface)",
                    color: "var(--text)",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && <TypingDots />}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input row */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          className="input flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("incomeAnalysis.chatPlaceholder")}
          disabled={loading}
        />
        <button
          type="button"
          className="btn-primary px-4 shrink-0"
          onClick={() => send()}
          disabled={!input.trim() || loading}
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            t("incomeAnalysis.chatSend")
          )}
        </button>
      </div>

      <p className="text-xs text-faint italic">{t("incomeAnalysis.chatDisclaimer")}</p>
    </div>
  );
}
