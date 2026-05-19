import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";

const STORAGE_KEY = "evision_cookie_consent";

export default function CookieConsentBanner() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      // Small delay so it doesn't flash immediately on load
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(STORAGE_KEY, "essential");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        position: "fixed",
        bottom: "1.25rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        width: "min(92vw, 560px)",
        background: "var(--modal-surface)",
        border: "1px solid var(--panel-border-strong)",
        borderRadius: "var(--r-xl)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)",
        padding: "1.125rem 1.375rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.875rem",
        animation: "slideUpFade 0.3s ease-out",
      }}
    >
      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <div className="flex items-start gap-3">
        <span style={{ fontSize: "1.25rem", lineHeight: 1, flexShrink: 0 }}>🍪</span>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
          {t("cookie.message")}{" "}
          <Link
            to="/privacy"
            className="underline"
            style={{ color: "var(--accent)" }}
            onClick={accept}
          >
            {t("cookie.learnMore")}
          </Link>
        </p>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          className="btn-secondary px-4 py-1.5 text-sm"
          onClick={decline}
        >
          {t("cookie.decline")}
        </button>
        <button
          type="button"
          className="btn-primary px-4 py-1.5 text-sm"
          onClick={accept}
        >
          {t("cookie.accept")}
        </button>
      </div>
    </div>
  );
}
