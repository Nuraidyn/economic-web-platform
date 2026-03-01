import React, { useEffect } from "react";

import { useI18n } from "../context/I18nContext";
import AuthPanel from "./AuthPanel";

export default function AuthModal({ isOpen, onClose }) {
  const { t } = useI18n();

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 auth-modal-overlay"
        aria-label={t("common.close")}
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-xl auth-modal-shell" onClick={(event) => event.stopPropagation()}>
        <button
          className="auth-modal-close-icon"
          type="button"
          aria-label={t("common.close")}
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 6l12 12" />
            <path d="M18 6L6 18" />
          </svg>
        </button>
        <AuthPanel onAuthSuccess={onClose} />
      </div>
    </div>
  );
}
