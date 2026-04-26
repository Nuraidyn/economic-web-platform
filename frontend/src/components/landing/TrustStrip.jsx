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
    <div ref={ref} className="panel" style={{ padding: 0, overflow: "hidden" }}>
      <div
        className="grid grid-cols-2 md:grid-cols-4"
        style={{ gap: "1px", background: "var(--panel-border)" }}
      >
        {STATS.map(({ keyLabel, keyValue }, i) => (
          <div
            key={keyLabel}
            className={[
              "flex flex-col items-center justify-center gap-1.5 py-6 px-5 text-center reveal",
              visible ? "is-visible" : "",
              `reveal-delay-${i + 1}`,
            ].join(" ")}
            style={{ background: "var(--panel)" }}
          >
            <span className="stat-value">{t(keyValue)}</span>
            <span className="label tracking-widest">{t(keyLabel)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
