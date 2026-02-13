import React, { useEffect, useMemo, useRef, useState } from "react";

import { explainChart } from "../api/analyticsApi";
import { useI18n } from "../context/I18nContext";

export default function ChartInsightAgent({
  datasets,
  indicators,
  startYear,
  endYear,
}) {
  const { language, t } = useI18n();
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
      setStatus({
        loading: false,
        error: t("ai.errorNoData"),
      });
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
    } catch (error) {
      setStatus({
        loading: false,
        error: t("ai.errorFailed"),
      });
    }
  };

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
        {status.error && <p className="text-xs text-rose-200/90">{status.error}</p>}
      </div>

      {answer && (
        <div className="surface p-4 space-y-2">
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
