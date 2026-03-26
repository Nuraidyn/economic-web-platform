import React from "react";
import { useI18n } from "../../context/I18nContext";
import { useReveal } from "../../hooks/useReveal";

/**
 * Closing CTA section — invites sign-up or sign-in.
 * @param {object} props
 * @param {() => void} props.onOpenAuth — opens the auth modal
 */
export default function CTAFinal({ onOpenAuth }) {
  const { t } = useI18n();
  const [ref, visible] = useReveal(0.1);

  return (
    <section ref={ref} aria-labelledby="cta-heading">
      <div
        className={["panel-wide relative overflow-hidden reveal", visible ? "is-visible" : ""].join(" ")}
      >
        {/* Background glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 rounded-[1.5rem]"
          style={{
            background:
              "radial-gradient(ellipse 60% 60% at 50% 110%, color-mix(in srgb, var(--accent) 20%, transparent), transparent 70%)",
          }}
        />

        <div className="flex flex-col items-center text-center gap-4 py-6">
          <span className="hero-kicker">{t("landing.ctaKicker")}</span>

          <h2
            id="cta-heading"
            className="panel-title"
            style={{ fontSize: "clamp(1.5rem, 3vw, 2.2rem)", maxWidth: "30rem" }}
          >
            {t("landing.ctaTitle")}
          </h2>

          <p className="text-muted text-sm max-w-md">{t("landing.ctaSubtitle")}</p>

          <div
            className={["flex flex-wrap gap-3 justify-center mt-2 reveal reveal-delay-2", visible ? "is-visible" : ""].join(" ")}
          >
            <button
              type="button"
              className="btn-primary px-6 py-3 text-sm"
              onClick={onOpenAuth}
            >
              {t("landing.ctaCTA")}
            </button>
            <button
              type="button"
              className="btn-secondary px-5 py-3 text-sm"
              onClick={onOpenAuth}
            >
              {t("landing.ctaLink")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
