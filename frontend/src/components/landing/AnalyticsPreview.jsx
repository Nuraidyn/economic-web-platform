import React from "react";
import { useI18n } from "../../context/I18nContext";
import { useReveal } from "../../hooks/useReveal";

/**
 * Section wrapper for the live analytics controls + charts.
 * Receives children (the actual analysis controls + ComparisonDashboard).
 */
export default function AnalyticsPreview({ children }) {
  const { t } = useI18n();
  const [ref, visible] = useReveal(0.05);

  return (
    <section ref={ref} aria-labelledby="analytics-section-heading">
      <div className={["text-center mb-6 reveal", visible ? "is-visible" : ""].join(" ")}>
        <span className="hero-kicker">{t("landing.analyticsSectionKicker")}</span>
        <h2
          id="analytics-section-heading"
          className="panel-title mt-2"
          style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)" }}
        >
          {t("landing.analyticsSectionTitle")}
        </h2>
        <p className="text-muted mt-2 text-sm max-w-lg mx-auto">
          {t("landing.analyticsSectionSubtitle")}
        </p>
      </div>

      <div className={["reveal reveal-delay-1", visible ? "is-visible" : ""].join(" ")}>
        {children}
      </div>
    </section>
  );
}
