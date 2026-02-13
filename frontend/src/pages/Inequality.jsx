import React, { useContext } from "react";

import AuthContext from "../context/AuthContext";
import { useAnalysis } from "../context/AnalysisContext";
import GiniTrendPanel from "../components/GiniTrendPanel";
import { useI18n } from "../context/I18nContext";

export default function InequalityPage() {
  const { user } = useContext(AuthContext);
  const { selectedCountries, startYear, endYear, chartType } = useAnalysis();
  const { t } = useI18n();

  return (
    <>
      <section className="hero">
        <div>
          <p className="hero-kicker">{t("inequalityPage.heroKicker")}</p>
          <h2 className="hero-title">{t("inequalityPage.heroTitle")}</h2>
          <p className="hero-subtitle">
            {t("inequalityPage.heroSubtitle")}
          </p>
        </div>
        <div className="hero-card">
          <h3 className="panel-title">{t("inequalityPage.notesTitle")}</h3>
          <ul className="text-xs text-muted space-y-2">
            <li>{t("inequalityPage.note1")}</li>
            <li>{t("inequalityPage.note2")}</li>
          </ul>
        </div>
      </section>

      <GiniTrendPanel
        canAccess={Boolean(user?.agreement_accepted)}
        countries={selectedCountries}
        startYear={startYear}
        endYear={endYear}
        chartType={chartType}
      />
    </>
  );
}
