import React from "react";
import { useI18n } from "../../context/I18nContext";
import { useReveal } from "../../hooks/useReveal";

const FEATURES = [
  {
    titleKey: "landing.feat1Title",
    descKey: "landing.feat1Desc",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 3v18h18" />
        <polyline points="7 16 11 11 14 14 18 9" />
      </svg>
    ),
  },
  {
    titleKey: "landing.feat2Title",
    descKey: "landing.feat2Desc",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3 Q3 12 12 21 Q21 12 12 3" />
        <line x1="3" y1="12" x2="21" y2="12" />
      </svg>
    ),
  },
  {
    titleKey: "landing.feat3Title",
    descKey: "landing.feat3Desc",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    titleKey: "landing.feat4Title",
    descKey: "landing.feat4Desc",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2" />
        <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2" />
      </svg>
    ),
  },
  {
    titleKey: "landing.feat5Title",
    descKey: "landing.feat5Desc",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10A15.3 15.3 0 0 1 8 12 15.3 15.3 0 0 1 12 2z" />
      </svg>
    ),
  },
  {
    titleKey: "landing.feat6Title",
    descKey: "landing.feat6Desc",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
        className={["text-center mb-8 reveal", visible ? "is-visible" : ""].join(" ")}
        ref={ref}
      >
        <span className="hero-kicker">{t("landing.featuresKicker")}</span>
        <h2 className="panel-title mt-2" style={{ fontSize: "clamp(1.5rem, 3vw, 2.2rem)" }} id="features-heading">
          {t("landing.featuresTitle")}
        </h2>
        <p className="text-muted mt-2 text-sm max-w-lg mx-auto">{t("landing.featuresSubtitle")}</p>
      </div>

      {/* Cards grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map(({ titleKey, descKey, icon }, i) => (
          <div
            key={titleKey}
            className={[
              "hero-card flex flex-col gap-3 reveal",
              visible ? "is-visible" : "",
              `reveal-delay-${Math.min(i + 1, 5)}`,
            ].join(" ")}
          >
            <span
              className="flex items-center justify-center w-10 h-10 rounded-xl"
              style={{
                background: "color-mix(in srgb, var(--accent) 14%, transparent)",
                color: "var(--accent)",
              }}
            >
              {icon}
            </span>
            <h3
              className="panel-title"
              style={{ fontSize: "1rem", fontWeight: 600 }}
            >
              {t(titleKey)}
            </h3>
            <p className="text-muted text-sm leading-relaxed">{t(descKey)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
