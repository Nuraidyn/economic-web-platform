import React from "react";
import { useI18n } from "../../context/I18nContext";
import { useReveal } from "../../hooks/useReveal";

const STEPS = [
  {
    num: "01",
    titleKey: "landing.step1Title",
    descKey:  "landing.step1Desc",
    accentColor: "var(--accent)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
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
    descKey:  "landing.step2Desc",
    accentColor: "var(--accent-2)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 3v18h18" />
        <polyline points="7 16 11 11 14 14 18 9" />
      </svg>
    ),
  },
  {
    num: "03",
    titleKey: "landing.step3Title",
    descKey:  "landing.step3Desc",
    accentColor: "var(--accent-3)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
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
      <div className={["text-center mb-12 reveal", visible ? "is-visible" : ""].join(" ")}>
        <span className="hero-kicker">{t("landing.howKicker")}</span>
        <h2
          id="how-heading"
          className="panel-title mt-3"
          style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", letterSpacing: "-0.025em" }}
        >
          {t("landing.howTitle")}
        </h2>
        <p className="text-muted mt-3 max-w-md mx-auto" style={{ fontSize: "0.95rem", lineHeight: "1.65" }}>
          {t("landing.howSubtitle")}
        </p>
      </div>

      {/* Steps */}
      <div className="grid md:grid-cols-3 gap-6 relative">
        {/* Connector line (desktop only) */}
        <div
          aria-hidden="true"
          className="hidden md:block absolute top-[2.75rem] left-[calc(33.33%+1.5rem)] right-[calc(33.33%+1.5rem)]"
          style={{
            height: "1px",
            background: "linear-gradient(to right, var(--accent-dim), var(--accent-2-dim))",
            zIndex: 0,
          }}
        />

        {STEPS.map(({ num, titleKey, descKey, icon, accentColor }, i) => (
          <div
            key={num}
            className={[
              "hero-card relative flex flex-col gap-4 reveal",
              visible ? "is-visible" : "",
              `reveal-delay-${i + 1}`,
            ].join(" ")}
          >
            {/* Accent top border */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 0, left: "1.5rem", right: "1.5rem",
                height: "2px",
                borderRadius: "0 0 4px 4px",
                background: accentColor,
                opacity: 0.65,
              }}
            />

            {/* Step number + icon row */}
            <div className="flex items-start justify-between">
              <span
                style={{
                  fontSize: "3rem",
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  lineHeight: 1,
                  color: accentColor,
                  opacity: 0.45,
                  userSelect: "none",
                  letterSpacing: "-0.04em",
                }}
              >
                {num}
              </span>

              <span
                className="flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0"
                style={{
                  background: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
                  color: accentColor,
                }}
              >
                {icon}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <h3 style={{ fontSize: "0.97rem", fontWeight: 700, letterSpacing: "-0.01em" }}>
                {t(titleKey)}
              </h3>
              <p className="text-muted" style={{ fontSize: "0.84rem", lineHeight: "1.62" }}>
                {t(descKey)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
