import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { explainChartMentor, reportSummary } from "../api/aiMentorApi";
import ReportModal from "./ai-mentor/ReportModal";
import SuggestionChips from "./ai-mentor/SuggestionChips";
import AuthContext from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { useUI } from "../context/UIContext";

export default function ChartInsightAgent({
  datasets,
  indicators,
  startYear,
  endYear,
}) {
  const { language, t } = useI18n();
  const { user, agreement } = useContext(AuthContext);
  const { openAuthModal } = useUI();
  const defaultPromptRef = useRef(t("ai.defaultPrompt"));
  const [question, setQuestion] = useState(defaultPromptRef.current);
  const [structured, setStructured] = useState(null);
  const [convId, setConvId] = useState(null);
  const [status, setStatus] = useState({ loading: false, error: "" });
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const indicatorMap = useMemo(
    () => new Map(indicators.map((item) => [item.code, item.label || item.name || item.code])),
    [indicators]
  );

  const canAsk = datasets.length > 0 && question.trim().length > 0;

  useEffect(() => {
    const nextDefault = t("ai.defaultPrompt");
    setQuestion((current) =>
      current === defaultPromptRef.current ? nextDefault : current
    );
    defaultPromptRef.current = nextDefault;
  }, [t]);

  const askAgent = async (overrideQuestion) => {
    const q = (overrideQuestion ?? question).trim();
    if (!q || datasets.length === 0) {
      setStatus({ loading: false, error: t("ai.errorNoData") });
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus({ loading: true, error: "" });
    setStructured(null);

    try {
      const payload = {
        question: q,
        language,
        conversation_id: convId,
        context_snapshot: {
          countries: [...new Set(datasets.flatMap((d) => d.series.map((s) => s.country)))],
          indicators: datasets.map((d) => indicatorMap.get(d.indicator) || d.indicator),
          year_range: [startYear, endYear],
        },
        start_year: startYear,
        end_year: endYear,
        datasets: datasets.map((entry) => ({
          indicator: entry.indicator,
          indicator_label: indicatorMap.get(entry.indicator) || entry.indicator,
          series: entry.series.map((cs) => ({
            country: cs.country,
            data: (cs.data || []).map((row) => ({ year: row.year, value: row.value })),
          })),
        })),
      };
      const data = await explainChartMentor(payload, controller.signal);
      if (controller.signal.aborted) return;

      setStructured(data);
      if (data.conversation_id) setConvId(data.conversation_id);
      setStatus({ loading: false, error: "" });
    } catch (err) {
      if (controller.signal.aborted || err.name === "CanceledError") return;
      setStatus({ loading: false, error: t("ai.errorFailed") });
    }
  };

  const handleReport = async () => {
    setReportOpen(true);
    setReportLoading(true);
    setReportMarkdown("");
    try {
      const data = await reportSummary({
        conversation_id: convId,
        context_snapshot: null,
        language,
      });
      setReportMarkdown(data.markdown);
    } catch {
      setReportMarkdown("Failed to generate report.");
    } finally {
      setReportLoading(false);
    }
  };

  /* ── Auth gate ── */
  if (!user) {
    return (
      <section className="panel-wide space-y-4">
        <div>
          <h3 className="panel-title">{t("ai.title")}</h3>
          <p className="text-xs text-muted mt-2">{t("ai.subtitle")}</p>
        </div>
        <div className="surface p-5 flex flex-col items-center gap-3 text-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-faint" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <p className="text-sm font-medium">{t("ai.requiresAuth")}</p>
          <button type="button" className="btn-primary" onClick={openAuthModal}>
            {t("navbar.signIn")}
          </button>
        </div>
      </section>
    );
  }

  /* ── Agreement gate ── */
  if (!agreement?.accepted) {
    return (
      <section className="panel-wide space-y-4">
        <div>
          <h3 className="panel-title">{t("ai.title")}</h3>
          <p className="text-xs text-muted mt-2">{t("ai.subtitle")}</p>
        </div>
        <div className="surface p-5 flex flex-col items-center gap-3 text-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-faint" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <p className="text-sm font-medium">{t("ai.requiresAgreement")}</p>
        </div>
      </section>
    );
  }

  const nextSteps = structured?.suggested_next_steps || [];
  const insights = structured?.insights || [];

  return (
    <section className="panel-wide space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="panel-title">{t("ai.title")}</h3>
          <p className="text-xs text-muted mt-2">{t("ai.subtitle")}</p>
        </div>
        <Link
          to="/ai-mentor"
          className="tab text-[10px] px-2 py-1 whitespace-nowrap flex-shrink-0"
        >
          Open in AI Mentor →
        </Link>
      </div>

      <div className="space-y-3">
        <label className="label">{t("ai.questionLabel")}</label>
        <textarea
          className="input min-h-[5.5rem]"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t("ai.placeholder")}
        />
        <div className="flex items-center justify-between gap-3">
          <button
            className="btn-primary"
            type="button"
            onClick={() => askAgent()}
            disabled={status.loading || !canAsk}
          >
            {status.loading ? t("ai.analyzing") : t("ai.explain")}
          </button>
          <p className="text-xs text-muted">
            {t("ai.rangeIndicators", {
              start: startYear,
              end: endYear,
              count: datasets.length,
            })}
          </p>
        </div>
        {status.error && (
          <p className="text-xs text-rose-200/90" role="alert">
            {status.error}
          </p>
        )}
      </div>

      {status.loading && (
        <div className="surface p-4 space-y-3" aria-busy="true" aria-label="Analyzing">
          <div className="skeleton skeleton-text w-32" />
          <div className="skeleton skeleton-text w-full" />
          <div className="skeleton skeleton-text w-5/6 opacity-70" />
          <div className="skeleton skeleton-text w-4/6 opacity-50" />
        </div>
      )}

      {structured && !status.loading && (
        <div className="surface p-4 space-y-3 ai-answer-enter">
          <p className="text-xs uppercase tracking-[0.2em] text-faint">
            {t("ai.explanationTitle")}
          </p>

          <p className="text-sm font-medium leading-relaxed">{structured.summary}</p>

          {insights.length > 0 && (
            <ol className="space-y-1 border-l-2 border-[var(--accent)] pl-3">
              {insights.map((insight, i) => (
                <li key={i} className="text-sm text-[var(--text-muted)]">
                  {insight}
                </li>
              ))}
            </ol>
          )}

          {structured.limitations && (
            <p className="text-xs italic text-[var(--text-faint)]">
              {structured.limitations}
            </p>
          )}

          {nextSteps.length > 0 && (
            <SuggestionChips
              suggestions={nextSteps}
              onSelect={(s) => {
                setQuestion(s);
                askAgent(s);
              }}
            />
          )}

          <div className="flex items-center gap-2 pt-1">
            {convId && (
              <button
                type="button"
                className="tab text-[10px] px-2 py-1"
                onClick={handleReport}
              >
                Export Report
              </button>
            )}
            {structured.provider && (
              <p className="text-[11px] text-faint">
                {structured.provider}
                {structured.model ? ` · ${structured.model}` : ""}
              </p>
            )}
          </div>
        </div>
      )}

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        markdown={reportMarkdown}
        isLoading={reportLoading}
      />
    </section>
  );
}
