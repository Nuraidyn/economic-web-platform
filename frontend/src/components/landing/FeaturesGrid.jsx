import React from "react";
import { useI18n } from "../../context/I18nContext";
import { useReveal } from "../../hooks/useReveal";

const FEATURES = [
  {
    titleKey: "landing.feat1Title",
    descKey:  "landing.feat1Desc",
    gradient: "linear-gradient(135deg, #5b5fc7, #0ea5e9)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 3v18h18" /><polyline points="7 16 11 11 14 14 18 9" />
      </svg>
    ),
  },
  {
    titleKey: "landing.feat2Title",
    descKey:  "landing.feat2Desc",
    gradient: "linear-gradient(135deg, #0ea5e9, #10b981)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3 Q3 12 12 21 Q21 12 12 3" />
        <line x1="3" y1="12" x2="21" y2="12" />
      </svg>
    ),
  },
  {
    titleKey: "landing.feat3Title",
    descKey:  "landing.feat3Desc",
    gradient: "linear-gradient(135deg, #10b981, #f59e0b)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    titleKey: "landing.feat4Title",
    descKey:  "landing.feat4Desc",
    gradient: "linear-gradient(135deg, #f59e0b, #f43f5e)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2.5" />
        <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2.5" />
      </svg>
    ),
  },
  {
    titleKey: "landing.feat5Title",
    descKey:  "landing.feat5Desc",
    gradient: "linear-gradient(135deg, #f43f5e, #818cf8)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10A15.3 15.3 0 0 1 8 12 15.3 15.3 0 0 1 12 2z" />
      </svg>
    ),
  },
  {
    titleKey: "landing.feat6Title",
    descKey:  "landing.feat6Desc",
    gradient: "linear-gradient(135deg, #818cf8, #5b5fc7)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
];

export default function FeaturesGrid() {
  const { t } = useI18n();
  const [ref, visible] = useReveal(0.08);

  return (
    <section aria-labelledby="features-heading">
      {/* Section header */}
      <div
        className={["text-center mb-10 reveal", visible ? "is-visible" : ""].join(" ")}
        ref={ref}
      >
        <span className="hero-kicker">{t("landing.featuresKicker")}</span>
        <h2
          id="features-heading"
          className="panel-title mt-3"
          style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", letterSpacing: "-0.025em" }}
        >
          {t("landing.featuresTitle")}
        </h2>
        <p className="text-muted mt-3 max-w-lg mx-auto" style={{ fontSize: "0.95rem", lineHeight: "1.65" }}>
          {t("landing.featuresSubtitle")}
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {FEATURES.map(({ titleKey, descKey, icon, gradient }, i) => (
          <div
            key={titleKey}
            className={[
              "hero-card relative overflow-hidden flex flex-col gap-3.5 reveal",
              visible ? "is-visible" : "",
              `reveal-delay-${Math.min(i + 1, 5)}`,
            ].join(" ")}
          >
            {/* Gradient accent bar on hover (via CSS .feat-card-accent) */}
            <div className="feat-card-accent" aria-hidden="true" />

            {/* Icon */}
            <span
              className="flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, color-mix(in srgb, ${gradient.match(/#[0-9a-f]+/i)?.[0] ?? "var(--accent)"} 15%, transparent), color-mix(in srgb, ${gradient.match(/#[0-9a-f]+/gi)?.[1] ?? "var(--accent-2)"} 12%, transparent))`,
                color: gradient.match(/#[0-9a-f]+/i)?.[0] ?? "var(--accent)",
              }}
            >
              {icon}
            </span>

            {/* Text */}
            <div className="flex flex-col gap-1.5">
              <h3 style={{ fontSize: "0.97rem", fontWeight: 700, letterSpacing: "-0.01em" }}>
                {t(titleKey)}
              </h3>
              <p className="text-muted" style={{ fontSize: "0.84rem", lineHeight: "1.62" }}>
                {t(descKey)}
              </p>
            </div>

            {/* Subtle bottom gradient accent */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                bottom: 0, left: 0, right: 0,
                height: "40%",
                background: `radial-gradient(ellipse 80% 60% at 50% 120%, color-mix(in srgb, ${gradient.match(/#[0-9a-f]+/i)?.[0] ?? "var(--accent)"} 8%, transparent), transparent)`,
                pointerEvents: "none",
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
