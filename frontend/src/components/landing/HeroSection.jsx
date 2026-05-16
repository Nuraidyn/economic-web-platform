import React from "react";
import { useI18n } from "../../context/I18nContext";
import { useTheme } from "../../context/ThemeContext";
import logoDark from "../../assets/logo-dark-transparent.png";
import { useReveal } from "../../hooks/useReveal";

/**
 * Landing hero — full-width opening section with headline, subhead, and CTA pair.
 * @param {object} props
 * @param {() => void} props.onScrollToAnalysis — scrolls to the analysis panel
 * @param {() => void} props.onOpenAuth — opens the auth modal
 */
export default function HeroSection({ onScrollToAnalysis, onOpenAuth }) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [ref, visible] = useReveal(0.01);

  return (
    <section
      ref={ref}
      className="relative hero-breakout"
      aria-label={t("landing.heroKicker")}
      style={{
        background: theme === "dark"
          ? `
            radial-gradient(ellipse 140% 90% at 50% 0%,   rgba(99,102,241,0.45) 0%, transparent 60%),
            radial-gradient(ellipse 100% 70% at 90% 100%, rgba(56,189,248,0.25) 0%, transparent 65%),
            radial-gradient(ellipse 80%  60% at 0%  90%,  rgba(129,140,248,0.20) 0%, transparent 60%)
          `
          : `
            radial-gradient(ellipse 140% 90% at 50% 0%,   rgba(91,95,199,0.22) 0%, transparent 60%),
            radial-gradient(ellipse 100% 70% at 90% 100%, rgba(91,95,199,0.12) 0%, transparent 65%),
            radial-gradient(ellipse 80%  60% at 0%  90%,  rgba(91,95,199,0.10) 0%, transparent 60%)
          `,
        borderBottom: "3px solid var(--panel-border-strong)",
      }}
    >
      {/* Subtle grid overlay */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="hero-bg-grid" />
      </div>

      <div
        className={[
          "hero-content py-24 md:py-36 flex flex-col items-center text-center gap-6 reveal",
          visible ? "is-visible" : "",
        ].join(" ")}
      >
        {/* Logo mark badge */}
        <img
          src={logoDark}
          alt="logo"
          className="mb-2 h-20 w-auto evision-logo-animate"
          aria-hidden="true"
        />

        {/* Kicker */}
        <span className="hero-kicker">{t("landing.heroKicker")}</span>

        {/* Headline */}
        <h1
          className="hero-title max-w-3xl mx-auto"
          style={{
            fontSize: "clamp(2.4rem, 5vw, 4.2rem)",
            background: "linear-gradient(135deg, var(--text) 0%, var(--accent) 60%, var(--accent-strong) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {t("landing.heroTitlePart1")}{" "}
          {t("landing.heroTitleAccent")}
          {t("landing.heroTitlePart2") ? " " + t("landing.heroTitlePart2") : ""}
        </h1>

        {/* Subtitle */}
        <p
          className="hero-subtitle text-center max-w-xl mx-auto"
          style={{ fontSize: "clamp(0.95rem, 2vw, 1.1rem)" }}
        >
          {t("landing.heroSubtitle")}
        </p>

        {/* CTA row */}
        <div
          className={[
            "flex flex-wrap gap-3 justify-center mt-2 reveal reveal-delay-2",
            visible ? "is-visible" : "",
          ].join(" ")}
        >
          <button
            type="button"
            className="btn-primary px-6 py-3 text-sm"
            onClick={onScrollToAnalysis}
          >
            {t("landing.heroCTA")}
          </button>
          <button
            type="button"
            className="btn-secondary px-5 py-3 text-sm"
            onClick={onOpenAuth}
          >
            {t("landing.heroLink")}
          </button>
        </div>

        {/* Data assurance chips */}
        <div
          className={[
            "flex flex-wrap justify-center gap-2 mt-4 reveal reveal-delay-3",
            visible ? "is-visible" : "",
          ].join(" ")}
        >
          {["landing.trust1", "landing.trust2", "landing.trust3", "landing.trust4", "landing.trust5"].map(
            (key) => (
              <span
                key={key}
                className="tab text-[0.68rem]"
                style={{ borderColor: "var(--panel-border)", color: "var(--text-faint)" }}
              >
                {t(key)}
              </span>
            )
          )}
        </div>
      </div>
    </section>
  );
}
