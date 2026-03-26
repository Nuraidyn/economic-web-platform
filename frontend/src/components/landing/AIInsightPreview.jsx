import React from "react";
import { useI18n } from "../../context/I18nContext";
import { useReveal } from "../../hooks/useReveal";

/**
 * Section wrapper for ChartInsightAgent.
 * Receives the agent as children so we don't duplicate logic.
 */
export default function AIInsightPreview({ children }) {
  const { t } = useI18n();
  const [ref, visible] = useReveal(0.05);

  return (
    <section ref={ref} aria-labelledby="ai-section-heading">
      <div className={["text-center mb-6 reveal", visible ? "is-visible" : ""].join(" ")}>
        <span className="hero-kicker">{t("landing.aiSectionKicker")}</span>
        <h2
          id="ai-section-heading"
          className="panel-title mt-2"
          style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)" }}
        >
          {t("landing.aiSectionTitle")}
        </h2>
        <p className="text-muted mt-2 text-sm max-w-lg mx-auto">
          {t("landing.aiSectionSubtitle")}
        </p>
      </div>

      <div className={["reveal reveal-delay-1", visible ? "is-visible" : ""].join(" ")}>
        {children}
      </div>
    </section>
  );
}
