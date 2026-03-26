import React from "react";
import { useI18n } from "../../context/I18nContext";
import { useReveal } from "../../hooks/useReveal";

const STATS = [
  { keyLabel: "landing.stat1Label", keyValue: "landing.stat1Value" },
  { keyLabel: "landing.stat2Label", keyValue: "landing.stat2Value" },
  { keyLabel: "landing.stat3Label", keyValue: "landing.stat3Value" },
  { keyLabel: "landing.stat4Label", keyValue: "landing.stat4Value" },
];

export default function TrustStrip() {
  const { t } = useI18n();
  const [ref, visible] = useReveal(0.1);

  return (
    <div ref={ref} className="panel">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "var(--panel-border)" }}>
        {STATS.map(({ keyLabel, keyValue }, i) => (
          <div
            key={keyLabel}
            className={[
              "flex flex-col items-center justify-center gap-1 py-5 px-4 text-center reveal",
              visible ? "is-visible" : "",
              `reveal-delay-${i + 1}`,
            ].join(" ")}
            style={{ background: "var(--panel)" }}
          >
            <span
              className="font-bold"
              style={{
                fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
                fontFamily: "Fraunces, serif",
                background: "linear-gradient(135deg, var(--accent), var(--accent-strong))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {t(keyValue)}
            </span>
            <span className="label tracking-widest">{t(keyLabel)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
