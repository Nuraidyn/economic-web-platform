import React from "react";

import { useI18n } from "../context/I18nContext";
import AuthPanel from "./AuthPanel";

export default function AuthModal({ isOpen, onClose }) {
  const { t } = useI18n();
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55"
        aria-label={t("common.close")}
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-xl">
        <div className="flex justify-end mb-2">
          <button className="btn-secondary" type="button" onClick={onClose}>
            {t("common.close")}
          </button>
        </div>
        <AuthPanel onAuthSuccess={onClose} />
      </div>
    </div>
  );
}
