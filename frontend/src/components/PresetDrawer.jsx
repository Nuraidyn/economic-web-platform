/**
 * PresetDrawer — slide-in panel for saving and loading analysis presets.
 *
 * Desktop: slides in from the right (380px).
 * Mobile:  slides up from the bottom (82vh, rounded top corners).
 *
 * Reads user + preset context directly so callers only need isOpen/onClose.
 */
import React, { useContext, useEffect } from "react";

import AuthContext from "../context/AuthContext";
import { useAnalysis } from "../context/AnalysisContext";
import { useI18n } from "../context/I18nContext";
import SavedPresetsPanel from "./SavedPresetsPanel";

export default function PresetDrawer({ isOpen, onClose }) {
  const { t } = useI18n();
  const { user } = useContext(AuthContext);
  const { presetPayload, applyPresetPayload } = useAnalysis();

  /* Trap scroll on body while drawer is open */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const handleLoad = (payload) => {
    applyPresetPayload(payload);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`preset-drawer-overlay ${isOpen ? "open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={`preset-drawer ${isOpen ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={t("workspace.presetsDrawerTitle")}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--panel-border)" }}
        >
          <div>
            <span className="page-section-kicker">{t("layout.saved")}</span>
            <h2
              className="panel-title"
              style={{ fontSize: "1.3rem", marginTop: "0.1rem" }}
            >
              {t("workspace.presetsDrawerTitle")}
            </h2>
          </div>
          <button
            type="button"
            className="auth-modal-close-icon"
            onClick={onClose}
            aria-label={t("workspace.closeDrawer")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <SavedPresetsPanel
            user={user}
            currentPayload={presetPayload}
            onLoad={handleLoad}
          />
        </div>
      </div>
    </>
  );
}
