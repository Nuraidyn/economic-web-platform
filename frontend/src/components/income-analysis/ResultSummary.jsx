import React from "react";
import { useI18n } from "../../context/I18nContext";
import { getCareerStage, yearsToRetirement } from "../../utils/incomeAnalysis";

function statusClass(status) {
  if (status === "deficit") return "text-rose-400";
  if (status === "strong") return "text-emerald-400";
  return "text-amber-400";
}

function statusBadgeClass(status) {
  if (status === "deficit") return "ineq-badge ineq-badge-risk";
  if (status === "strong") return "ineq-badge ineq-badge-good";
  return "ineq-badge ineq-badge-neutral";
}

function StatCard({ label, value, sub, highlight }) {
  return (
    <div className="panel space-y-2">
      <p className="label">{label}</p>
      <p className={`text-2xl font-semibold tracking-tight ${highlight || ""}`}>{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

export default function ResultSummary({ data }) {
  const { t } = useI18n();
  const { netSavings, savingsRate, projectedIncome, financialStatus, currency, age, experienceYears } = data;

  const fmt = (n) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(n);

  const statusLabel = {
    deficit: t("incomeAnalysis.statusDeficit"),
    stable:  t("incomeAnalysis.statusStable"),
    strong:  t("incomeAnalysis.statusStrong"),
  }[financialStatus] || financialStatus;

  const careerStage    = experienceYears != null ? getCareerStage(experienceYears) : null;
  const retirementYrs  = age != null ? yearsToRetirement(age) : null;

  return (
    <div className="space-y-4">
      <h3 className="panel-title">{t("incomeAnalysis.resultsTitle")}</h3>

      {/* Row 1 — financial KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("incomeAnalysis.netSavings")}
          value={fmt(netSavings)}
          sub={t("incomeAnalysis.perMonth")}
          highlight={netSavings < 0 ? "text-rose-400" : "text-emerald-400"}
        />
        <StatCard
          label={t("incomeAnalysis.savingsRate")}
          value={`${savingsRate.toFixed(1)}%`}
          highlight={savingsRate < 0 ? "text-rose-400" : savingsRate >= 20 ? "text-emerald-400" : ""}
        />
        <StatCard
          label={t("incomeAnalysis.projectedIncome")}
          value={fmt(projectedIncome)}
          sub={t("incomeAnalysis.perMonth")}
        />
        <div className="panel space-y-2">
          <p className="label">{t("incomeAnalysis.financialStatus")}</p>
          <span className={statusBadgeClass(financialStatus)}>{statusLabel}</span>
          <p className={`text-xs ${statusClass(financialStatus)}`}>
            {financialStatus === "deficit" && t("incomeAnalysis.statusDeficitDesc")}
            {financialStatus === "stable"  && t("incomeAnalysis.statusStableDesc")}
            {financialStatus === "strong"  && t("incomeAnalysis.statusStrongDesc")}
          </p>
        </div>
      </div>

      {/* Row 2 — career profile (only when age/experience provided) */}
      {(careerStage || retirementYrs != null) && (
        <div className="grid grid-cols-2 gap-4">
          {careerStage && (
            <div className="panel space-y-2">
              <p className="label">{t("incomeAnalysis.careerStage")}</p>
              <p className={`text-xl font-semibold tracking-tight ${careerStage.color}`}>
                {t(careerStage.labelKey)}
              </p>
              <p className="text-xs text-muted">
                {t("incomeAnalysis.yearsExperience", { n: experienceYears })}
              </p>
            </div>
          )}
          {retirementYrs != null && (
            <div className="panel space-y-2">
              <p className="label">{t("incomeAnalysis.retirementTitle")}</p>
              <p className="text-xl font-semibold tracking-tight">
                {retirementYrs === 0
                  ? <span className="text-emerald-400">{t("incomeAnalysis.retirementAge")}</span>
                  : <span>{retirementYrs} <span className="text-base font-normal text-muted">{t("incomeAnalysis.retirementYears")}</span></span>
                }
              </p>
              <p className="text-xs text-muted">{t("incomeAnalysis.retirementNote")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
