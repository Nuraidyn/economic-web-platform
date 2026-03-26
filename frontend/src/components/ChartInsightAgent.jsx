import React, { useContext, useEffect, useMemo, useRef, useState } from "react";

import { explainChart } from "../api/analyticsApi";
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
  const { user } = useContext(AuthContext);
  const { openAuthModal } = useUI();
  const defaultPromptRef = useRef(t("ai.defaultPrompt"));
  const [question, setQuestion] = useState(defaultPromptRef.current);
  const [answer, setAnswer] = useState("");
  const [meta, setMeta] = useState({ provider: "", model: "", warning: "" });
  const [status, setStatus] = useState({ loading: false, error: "" });

  const indicatorMap = useMemo(() => {
    return new Map(indicators.map((item) => [item.code, item.label || item.name || item.code]));
  }, [indicators]);

  const canAsk = datasets.length > 0 && question.trim().length > 0;

  useEffect(() => {
    const nextDefault = t("ai.defaultPrompt");
    setQuestion((current) => (current === defaultPromptRef.current ? nextDefault : current));
    defaultPromptRef.current = nextDefault;
  }, [t]);

  const askAgent = async () => {
    if (!canAsk) {
      setStatus({ loading: false, error: t("ai.errorNoData") });
      return;
    }
    setStatus({ loading: true, error: "" });
    try {
      const payload = {
        question: question.trim(),
        language,
        start_year: startYear,
        end_year: endYear,
        datasets: datasets.map((entry) => ({
          indicator: entry.indicator,
          indicator_label: indicatorMap.get(entry.indicator) || entry.indicator,
          series: entry.series.map((countrySeries) => ({
            country: countrySeries.country,
            data: (countrySeries.data || []).map((row) => ({
              year: row.year,
              value: row.value,
            })),
          })),
        })),
      };
      const response = await explainChart(payload);
      setAnswer(response.answer || "");
      setMeta({
        provider: response.provider || "",
        model: response.model || "",
        warning: response.warning || "",
      });
      setStatus({ loading: false, error: "" });
    } catch {
      setStatus({ loading: false, error: t("ai.errorFailed") });
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
  if (!user.agreement_accepted) {
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

  return (
    <section className="panel-wide space-y-4">
      <div>
        <h3 className="panel-title">{t("ai.title")}</h3>
        <p className="text-xs text-muted mt-2">
          {t("ai.subtitle")}
        </p>
      </div>

      <div className="space-y-3">
        <label className="label">{t("ai.questionLabel")}</label>
        <textarea
          className="input min-h-[5.5rem]"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={t("ai.placeholder")}
        />
        <div className="flex items-center justify-between gap-3">
          <button className="btn-primary" type="button" onClick={askAgent} disabled={status.loading}>
            {status.loading ? t("ai.analyzing") : t("ai.explain")}
          </button>
          <p className="text-xs text-muted">
            {t("ai.rangeIndicators", { start: startYear, end: endYear, count: datasets.length })}
          </p>
        </div>
        {status.error && <p className="text-xs text-rose-200/90" role="alert">{status.error}</p>}
      </div>

      {/* Loading skeleton while AI is processing */}
      {status.loading && (
        <div className="surface p-4 space-y-3" aria-busy="true" aria-label="Analyzing">
          <div className="skeleton skeleton-text w-32" />
          <div className="skeleton skeleton-text w-full" />
          <div className="skeleton skeleton-text w-5/6 opacity-70" />
          <div className="skeleton skeleton-text w-4/6 opacity-50" />
        </div>
      )}

      {/* Answer panel with soft entrance */}
      {answer && !status.loading && (
        <div className="surface p-4 space-y-2 ai-answer-enter">
          <p className="text-xs uppercase tracking-[0.2em] text-faint">{t("ai.explanationTitle")}</p>
          <p className="text-sm whitespace-pre-wrap">{answer}</p>
          {(meta.provider || meta.model || meta.warning) && (
            <p className="text-[11px] text-faint">
              {meta.provider ? `${t("ai.provider")}: ${meta.provider}` : `${t("ai.provider")}: ${t("ai.providerNa")}`}
              {meta.model ? ` · ${t("ai.model")}: ${meta.model}` : ""}
              {meta.warning ? ` · ${meta.warning}` : ""}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
