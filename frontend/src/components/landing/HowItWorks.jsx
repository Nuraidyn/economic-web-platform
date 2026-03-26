import React from "react";
import { useI18n } from "../../context/I18nContext";
import { useReveal } from "../../hooks/useReveal";

const STEPS = [
  {
    num: "01",
    titleKey: "landing.step1Title",
    descKey: "landing.step1Desc",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="11" y1="8" x2="11" y2="14" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </svg>
    ),
  },
  {
    num: "02",
    titleKey: "landing.step2Title",
    descKey: "landing.step2Desc",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 3v18h18" />
        <polyline points="7 16 11 11 14 14 18 9" />
      </svg>
    ),
  },
  {
    num: "03",
    titleKey: "landing.step3Title",
    descKey: "landing.step3Desc",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
        <path d="M8 12h8M12 8l4 4-4 4" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  const { t } = useI18n();
  const [ref, visible] = useReveal(0.08);

  return (
    <section ref={ref} aria-labelledby="how-heading">
      {/* Header */}
      <div className={["text-center mb-10 reveal", visible ? "is-visible" : ""].join(" ")}>
        <span className="hero-kicker">{t("landing.howKicker")}</span>
        <h2
          id="how-heading"
          className="panel-title mt-2"
          style={{ fontSize: "clamp(1.5rem, 3vw, 2.2rem)" }}
        >
          {t("landing.howTitle")}
        </h2>
        <p className="text-muted mt-2 text-sm max-w-md mx-auto">{t("landing.howSubtitle")}</p>
      </div>

      {/* Steps */}
      <div className="grid md:grid-cols-3 gap-4 relative">
        {STEPS.map(({ num, titleKey, descKey, icon }, i) => (
          <div
            key={num}
            className={[
              "hero-card flex flex-col gap-4 reveal",
              visible ? "is-visible" : "",
              `reveal-delay-${i + 1}`,
            ].join(" ")}
          >
            {/* Step number */}
            <div className="flex items-start justify-between">
              <span className="how-step-num">{num}</span>
              <span
                className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
                style={{
                  background: "color-mix(in srgb, var(--accent) 14%, transparent)",
                  color: "var(--accent)",
                }}
              >
                {icon}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <h3
                className="panel-title"
                style={{ fontSize: "1rem", fontWeight: 600 }}
              >
                {t(titleKey)}
              </h3>
              <p className="text-muted text-sm leading-relaxed">{t(descKey)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
