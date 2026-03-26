import React from "react";
import { EVisionMark } from "../EVisionLogo";
import { useI18n } from "../../context/I18nContext";
import { useReveal } from "../../hooks/useReveal";

/**
 * Landing hero — full-width opening section with headline, subhead, and CTA pair.
 * @param {object} props
 * @param {() => void} props.onScrollToAnalysis — scrolls to the analysis panel
 * @param {() => void} props.onOpenAuth — opens the auth modal
 */
export default function HeroSection({ onScrollToAnalysis, onOpenAuth }) {
  const { t } = useI18n();
  const [ref, visible] = useReveal(0.01);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden"
      aria-label={t("landing.heroKicker")}
    >
      {/* ── Animated background system ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/* Drifting accent blobs — pure CSS, compositor-only transforms */}
        <div className="hero-bg-blob hero-bg-blob-1" />
        <div className="hero-bg-blob hero-bg-blob-2" />
        <div className="hero-bg-blob hero-bg-blob-3" />
        {/* Subtle data-grid overlay */}
        <div className="hero-bg-grid" />
        {/* Central readability vignette — ensures text contrast in both themes */}
        <div className="hero-bg-vignette" />
        {/* Bottom edge fade to page canvas */}
        <div className="hero-bg-bottom-fade" />
      </div>

      <div
        className={[
          "hero-content py-24 md:py-36 flex flex-col items-center text-center gap-6 reveal",
          visible ? "is-visible" : "",
        ].join(" ")}
      >
        {/* Logo mark badge */}
        <EVisionMark size={56} animate className="mb-2" />

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
