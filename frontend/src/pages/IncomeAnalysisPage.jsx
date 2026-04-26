/**
 * IncomeAnalysisPage — personal income & savings analysis:
 *   1. Hero context
 *   2. Input form (8 fields)
 *   3. Result summary cards (shown after first submit)
 *   4. AI Insights block (on-demand generation)
 */
import React, { useState } from "react";

import { useI18n } from "../context/I18nContext";
import { useAnalysis } from "../context/AnalysisContext";
import IncomeForm from "../components/income-analysis/IncomeForm";
import ResultSummary from "../components/income-analysis/ResultSummary";
import AIInsights from "../components/income-analysis/AIInsights";
import IncomeComparisonSection from "../components/income-analysis/IncomeComparisonSection";
import {
  calcSavings,
  calcSavingsRate,
  calcProjectedIncome,
  calcFinancialStatus,
} from "../utils/incomeAnalysis";

export default function IncomeAnalysisPage() {
  const { t } = useI18n();
  const { countries } = useAnalysis();
  const [results, setResults] = useState(null);
  const [formData, setFormData] = useState(null);

  function handleSubmit(data) {
    const netSavings     = calcSavings(data.monthlyIncome, data.monthlyExpenses);
    const savingsRate    = calcSavingsRate(data.monthlyIncome, data.monthlyExpenses);
    const projectedIncome = calcProjectedIncome(data.monthlyIncome, data.growthPct, 1);
    const financialStatus = calcFinancialStatus(data.monthlyIncome, data.monthlyExpenses);

    setFormData(data);
    setResults({ netSavings, savingsRate, projectedIncome, financialStatus, currency: data.currency });
  }

  return (
    <>
      {/* ══ 1. HERO ══════════════════════════════════════════════ */}
      <section className="hero">
        <div>
          <p className="hero-kicker">{t("incomeAnalysis.heroKicker")}</p>
          <h2
            className="hero-title"
            style={{
              background: "linear-gradient(135deg, var(--text) 0%, var(--accent) 55%, var(--accent-2) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {t("incomeAnalysis.heroTitle")}
          </h2>
          <p className="hero-subtitle">{t("incomeAnalysis.heroSubtitle")}</p>
        </div>

        <div
          className="hero-card relative overflow-hidden"
          style={{ borderColor: "var(--panel-border-strong)" }}
        >
          {/* Accent corner glow */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute", top: 0, right: 0,
              width: "60%", height: "60%",
              background: "radial-gradient(ellipse at 100% 0%, color-mix(in srgb, var(--accent-2) 10%, transparent), transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <h3 className="panel-title relative z-10">{t("incomeAnalysis.notesTitle")}</h3>
          <ul className="space-y-2 mt-3 relative z-10">
            {[t("incomeAnalysis.note1"), t("incomeAnalysis.note2")].map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted">
                <span
                  className="mt-0.5 shrink-0 rounded-full"
                  style={{
                    width: "5px", height: "5px",
                    background: "var(--accent)",
                    opacity: 0.6,
                    marginTop: "0.45rem",
                  }}
                />
                {note}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="section-divider" aria-hidden="true" />

      {/* ══ 2. FORM + RESULTS ═══════════��════════════════════════ */}
      <section>
        <div className="grid md:grid-cols-2 gap-6 items-start">
          <IncomeForm onSubmit={handleSubmit} countries={countries} />

          {results ? (
            <ResultSummary data={results} />
          ) : (
            <div
              className="panel flex flex-col items-center justify-center gap-3 text-center"
              style={{ minHeight: "16rem" }}
            >
              <div
                style={{
                  width: "3rem", height: "3rem",
                  borderRadius: "var(--r-lg)",
                  background: "var(--accent-dim)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--accent)",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 3v18h18" /><polyline points="7 16 11 11 14 14 18 9" />
                </svg>
              </div>
              <p className="text-sm text-muted max-w-xs" style={{ lineHeight: "1.6" }}>
                {t("incomeAnalysis.emptyState")}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ══ 3. AI INSIGHTS ═══════════════���═══════════════════════ */}
      {results && formData && (
        <>
          <div className="section-divider" aria-hidden="true" />
          <AIInsights formData={formData} />
        </>
      )}

      {/* ══ 4. INCOME COMPARISON ═════════════════════════════════ */}
      {results && formData && (
        <>
          <div className="section-divider" aria-hidden="true" />
          <IncomeComparisonSection
            userSalary={formData.monthlyIncome}
            userCountry={formData.country}
          />
        </>
      )}
    </>
  );
}
