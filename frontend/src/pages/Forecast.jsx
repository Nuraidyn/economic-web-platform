import React, { useContext } from "react";

import ForecastPanel from "../components/ForecastPanel";
import AuthContext from "../context/AuthContext";
import { useAnalysis } from "../context/AnalysisContext";
import { useI18n } from "../context/I18nContext";

export default function ForecastPage() {
  const { user } = useContext(AuthContext);
  const { countries, indicators, selectedCountries, selectedIndicators } = useAnalysis();
  const { t } = useI18n();

  return (
    <>
      <section className="hero">
        <div>
          <p className="hero-kicker">{t("forecastPage.heroKicker")}</p>
          <h2 className="hero-title">{t("forecastPage.heroTitle")}</h2>
          <p className="hero-subtitle">
            {t("forecastPage.heroSubtitle")}
          </p>
        </div>
        <div className="hero-card">
          <h3 className="panel-title">{t("forecastPage.accessTitle")}</h3>
          <p className="text-xs text-muted mt-2">
            {t("forecastPage.accessSubtitle")}
          </p>
        </div>
      </section>

      <ForecastPanel
        canAccess={Boolean(user?.agreement_accepted)}
        countries={countries}
        indicators={indicators}
        defaultCountry={selectedCountries[0] || ""}
        defaultIndicator={selectedIndicators[0] || ""}
      />
    </>
  );
}
