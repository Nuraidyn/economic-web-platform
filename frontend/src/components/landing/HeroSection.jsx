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
      className="relative hero-breakout overflow-hidden"
      aria-label={t("landing.heroKicker")}
      style={{
        background: "var(--panel)",
        borderBottom: "2px solid var(--panel-border-strong)",
      }}
    >
      {/* ── Background layers (same system as CTAFinal) ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {/* Bottom radial glow */}
        <div style={{
          position: "absolute", inset: 0,
          background: theme === "dark"
            ? "radial-gradient(ellipse 80% 65% at 50% 115%, color-mix(in srgb, var(--accent) 36%, transparent), transparent 72%)"
            : "radial-gradient(ellipse 80% 65% at 50% 115%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 72%)",
        }} />
        {/* Top-center glow */}
        <div style={{
          position: "absolute", inset: 0,
          background: theme === "dark"
            ? "radial-gradient(ellipse 70% 55% at 50% -10%, color-mix(in srgb, var(--accent) 32%, transparent), transparent 70%)"
            : "radial-gradient(ellipse 70% 55% at 50% -10%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 70%)",
        }} />
        {/* Right corner accent */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "60%",
          background: theme === "dark"
            ? "radial-gradient(ellipse 50% 60% at 88% 0%, color-mix(in srgb, var(--accent-2) 18%, transparent), transparent 65%)"
            : "radial-gradient(ellipse 50% 60% at 88% 0%, color-mix(in srgb, var(--accent-2) 10%, transparent), transparent 65%)",
        }} />
        {/* Left corner accent */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "60%",
          background: theme === "dark"
            ? "radial-gradient(ellipse 40% 50% at 12% 0%, color-mix(in srgb, var(--accent-3) 14%, transparent), transparent 60%)"
            : "radial-gradient(ellipse 40% 50% at 12% 0%, color-mix(in srgb, var(--accent-3) 8%, transparent), transparent 60%)",
        }} />
        {/* Grid overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage:
            "linear-gradient(to right, var(--panel-border) 1px, transparent 1px), linear-gradient(to bottom, var(--panel-border) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
          opacity: theme === "dark" ? 0.07 : 0.10,
        }} />
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
