import React from "react";
import { useI18n } from "../../context/I18nContext";
import { useReveal } from "../../hooks/useReveal";

/**
 * Closing CTA section — invites sign-up or sign-in.
 */
export default function CTAFinal({ onOpenAuth }) {
  const { t } = useI18n();
  const [ref, visible] = useReveal(0.1);

  return (
    <section ref={ref} aria-labelledby="cta-heading">
      <div
        className={["panel-wide relative overflow-hidden reveal", visible ? "is-visible" : ""].join(" ")}
        style={{ borderColor: "var(--panel-border-strong)" }}
      >
        {/* Multi-layer background glow */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[var(--r-lg)]">
          {/* Bottom radial glow */}
          <div style={{
            position: "absolute", inset: 0,
            background:
              "radial-gradient(ellipse 70% 70% at 50% 115%, color-mix(in srgb, var(--accent) 24%, transparent), transparent 72%)",
          }} />
          {/* Corner accent glows */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0,
            height: "50%",
            background:
              "radial-gradient(ellipse 50% 60% at 80% 0%, color-mix(in srgb, var(--accent-2) 10%, transparent), transparent 65%)",
          }} />
          {/* Grid overlay */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage:
              "linear-gradient(to right, var(--panel-border) 1px, transparent 1px), linear-gradient(to bottom, var(--panel-border) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            opacity: 0.08,
            borderRadius: "var(--r-lg)",
          }} />
        </div>

        <div className="flex flex-col items-center text-center gap-5 py-8 relative z-10">
          {/* Kicker */}
          <span className="hero-kicker">{t("landing.ctaKicker")}</span>

          {/* Headline */}
          <h2
            id="cta-heading"
            style={{
              fontSize: "clamp(1.6rem, 3.5vw, 2.6rem)",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              maxWidth: "28rem",
              background: "linear-gradient(135deg, var(--text) 0%, var(--accent) 60%, var(--accent-2) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {t("landing.ctaTitle")}
          </h2>

          <p className="text-muted max-w-md" style={{ fontSize: "0.95rem", lineHeight: "1.65" }}>
            {t("landing.ctaSubtitle")}
          </p>

          {/* CTA buttons */}
          <div className={[
            "flex flex-wrap gap-3 justify-center mt-1 reveal reveal-delay-2",
            visible ? "is-visible" : "",
          ].join(" ")}>
            <button
              type="button"
              className="btn-primary px-7 py-3"
              style={{ fontSize: "0.9rem" }}
              onClick={onOpenAuth}
            >
              {t("landing.ctaCTA")}
            </button>
            <button
              type="button"
              className="btn-secondary px-6 py-3"
              onClick={onOpenAuth}
            >
              {t("landing.ctaLink")}
            </button>
          </div>

          {/* Trust chips */}
          <div className={[
            "flex flex-wrap justify-center gap-2 mt-2 reveal reveal-delay-3",
            visible ? "is-visible" : "",
          ].join(" ")}>
            {["landing.trust1", "landing.trust3", "landing.trust5"].map((key) => (
              <span
                key={key}
                className="tab"
                style={{ fontSize: "0.65rem" }}
              >
                {t(key)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
