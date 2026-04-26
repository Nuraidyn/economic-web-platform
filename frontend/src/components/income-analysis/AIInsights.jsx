import React, { useRef, useState } from "react";
import { useI18n } from "../../context/I18nContext";
import { fetchIncomeInsights } from "../../api/analyticsApi";

const PROVIDER_LABELS = {
  openai:   "OpenAI",
  gemini:   "Gemini",
  groq:     "Groq",
  fallback: "Offline",
};

function TipList({ items }) {
  return (
    <ul className="space-y-1.5 mt-2">
      {items.map((tip, idx) => (
        <li key={idx} className="flex items-start gap-2 text-sm text-muted">
          <span className="mt-0.5 shrink-0 text-[var(--accent)]">›</span>
          <span>{tip}</span>
        </li>
      ))}
    </ul>
  );
}

function ProviderBadge({ provider }) {
  const isFallback = provider === "fallback";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold
        ${isFallback
          ? "bg-[color-mix(in_srgb,var(--text-faint)_12%,transparent)] text-faint border border-[color-mix(in_srgb,var(--text-faint)_20%,transparent)]"
          : "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[color-mix(in_srgb,var(--accent)_90%,var(--text))] border border-[color-mix(in_srgb,var(--accent)_28%,transparent)]"
        }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isFallback ? "bg-current opacity-40" : "bg-[var(--accent)]"}`} />
      {PROVIDER_LABELS[provider] ?? provider}
    </span>
  );
}

function CountryCard({ country, reason, estimated_income_range }) {
  return (
    <div className="panel space-y-1.5">
      <p className="text-sm font-semibold">{country}</p>
      <p className="text-xs text-muted leading-relaxed">{reason}</p>
      <p className="text-xs text-faint italic">{estimated_income_range}</p>
    </div>
  );
}

export default function AIInsights({ formData }) {
  const { t } = useI18n();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  async function generate() {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setInsights(null);

    try {
      const payload = {
        age: formData.age,
        country: formData.country,
        profession: formData.profession,
        experience_years: formData.experienceYears,
        monthly_income: formData.monthlyIncome,
        monthly_expenses: formData.monthlyExpenses,
        yearly_growth_percent: formData.growthPct ?? 0,
        currency: formData.currency ?? "USD",
      };
      const data = await fetchIncomeInsights(payload, controller.signal);
      setInsights(data);
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return;
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        setError(t("incomeAnalysis.errorAuth"));
      } else {
        setError(t("incomeAnalysis.errorFetch"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel-wide space-y-5">
      <div>
        <span className="page-section-kicker">{t("incomeAnalysis.aiTitle")}</span>
        <p className="text-xs text-muted mt-1">{t("incomeAnalysis.aiSubtitle")}</p>
      </div>

      {!insights && !loading && !error && (
        <button type="button" className="btn-primary" onClick={generate}>
          {t("incomeAnalysis.generateInsights")}
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-3 text-sm text-muted" aria-live="polite" aria-busy="true">
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {t("incomeAnalysis.generating")}
        </div>
      )}

      {error && !loading && (
        <div className="space-y-3">
          <p className="text-sm text-rose-400" role="alert">{error}</p>
          <button type="button" className="btn-secondary text-xs py-1.5 px-4" onClick={generate}>
            {t("incomeAnalysis.retry")}
          </button>
        </div>
      )}

      {insights && !loading && (
        <div className="space-y-6">
          {/* Provider badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-faint">{t("incomeAnalysis.poweredBy")}</span>
            <ProviderBadge provider={insights.provider} />
          </div>

          {/* Summary */}
          <div>
            <p className="label mb-1.5">{t("incomeAnalysis.summary")}</p>
            <p className="text-sm text-muted leading-relaxed">{insights.summary}</p>
          </div>

          {/* Income Benchmarks */}
          {insights.income_benchmark?.length > 0 && (
            <div>
              <p className="label">{t("incomeAnalysis.benchmark")}</p>
              <TipList items={insights.income_benchmark} />
            </div>
          )}

          {/* Action Plan */}
          <div>
            <p className="label mb-3">{t("incomeAnalysis.actionPlan")}</p>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { key: "next_3_months",  label: t("incomeAnalysis.month3") },
                { key: "next_6_months",  label: t("incomeAnalysis.month6") },
                { key: "next_12_months", label: t("incomeAnalysis.month12") },
              ].map(({ key, label }) => (
                <div key={key} className="panel space-y-2">
                  <p className="text-xs uppercase tracking-widest text-faint font-semibold">{label}</p>
                  <ul className="space-y-1">
                    {(insights.action_plan?.[key] ?? []).map((item, i) => (
                      <li key={i} className="text-sm text-muted leading-relaxed flex items-start gap-1.5">
                        <span className="text-[var(--accent)] shrink-0">›</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Potential Countries */}
          {insights.potential_countries?.length > 0 && (
            <div>
              <p className="label mb-3">{t("incomeAnalysis.topCountries")}</p>
              <div className="grid md:grid-cols-3 gap-4">
                {insights.potential_countries.map((c) => (
                  <CountryCard key={c.country} {...c} />
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-xs text-faint italic border-t border-[var(--border)] pt-4">
            {insights.disclaimer}
          </p>

          {/* Regenerate */}
          <button
            type="button"
            className="btn-secondary text-xs py-1.5 px-4"
            onClick={generate}
          >
            {t("incomeAnalysis.generateInsights")}
          </button>
        </div>
      )}
    </div>
  );
}
