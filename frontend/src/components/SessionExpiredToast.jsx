import React, { useContext, useEffect, useState } from "react";
import AuthContext from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { useUI } from "../context/UIContext";

export default function SessionExpiredToast() {
  const { t } = useI18n();
  const { authStatus } = useContext(AuthContext);
  const { openAuthModal } = useUI();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (authStatus.expired) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [authStatus.expired]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.25rem",
        zIndex: 9998,
        background: "var(--modal-surface)",
        border: "1px solid var(--panel-border-strong)",
        borderLeft: "3px solid var(--accent)",
        borderRadius: "var(--r-md)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.14)",
        padding: "0.875rem 1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        maxWidth: "320px",
        animation: "toastIn 0.25s ease-out",
      }}
    >
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <p className="text-sm flex-1" style={{ color: "var(--text)" }}>
        {t("session.expired")}
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          className="btn-primary px-3 py-1 text-sm"
          onClick={() => { setVisible(false); openAuthModal(); }}
        >
          {t("session.expiredAction")}
        </button>
        <button
          type="button"
          className="text-[var(--text-faint)] hover:text-[var(--text)] transition-colors text-lg leading-none"
          onClick={() => setVisible(false)}
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
}
