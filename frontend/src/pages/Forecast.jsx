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
      {/* ── Hero ── */}
      <section className="hero">
        <div>
          <p className="hero-kicker">{t("forecastPage.heroKicker")}</p>
          <h2
            className="hero-title"
            style={{
              background: "linear-gradient(135deg, var(--text) 0%, var(--accent-2) 50%, var(--accent-3) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {t("forecastPage.heroTitle")}
          </h2>
          <p className="hero-subtitle">{t("forecastPage.heroSubtitle")}</p>
        </div>

        <div
          className="hero-card relative overflow-hidden"
          style={{ borderColor: "var(--panel-border-strong)" }}
        >
          {/* Accent glow */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute", top: 0, right: 0, bottom: 0, left: 0,
              background:
                "radial-gradient(ellipse 70% 70% at 90% 10%, color-mix(in srgb, var(--accent-3) 10%, transparent), transparent 65%)",
              pointerEvents: "none",
            }}
          />
          <h3 className="panel-title relative z-10">{t("forecastPage.accessTitle")}</h3>
          <p className="text-xs text-muted mt-2 relative z-10">
            {t("forecastPage.accessSubtitle")}
          </p>
        </div>
      </section>

      <div className="section-divider" aria-hidden="true" />

      {/* ── Forecast Panel ── */}
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
