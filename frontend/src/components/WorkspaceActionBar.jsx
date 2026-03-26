/**
 * WorkspaceActionBar — sticky action bar anchored below the Navbar.
 *
 * Contains:
 *   - Workspace section label
 *   - "Presets" button that opens the PresetDrawer
 *
 * Sticky behaviour:
 *   - Desktop: sticks at `--navbar-h` (4.5rem) from the top, z-index 40
 *   - Mobile:  same, but condensed (label hidden)
 */
import React from "react";

import { useI18n } from "../context/I18nContext";

/* Bookmark icon for Presets button */
const BookmarkIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

export default function WorkspaceActionBar({ onOpenDrawer }) {
  const { t } = useI18n();

  return (
    <div className="workspace-action-bar">
      <div className="max-w-[1480px] mx-auto px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Left — section label */}
        <span className="page-section-kicker hidden sm:flex">
          {t("workspace.title")}
        </span>

        {/* Right — actions */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            className="btn-secondary flex items-center gap-1.5 py-1.5 px-3"
            onClick={onOpenDrawer}
            aria-label={t("workspace.openPresets")}
          >
            <BookmarkIcon />
            <span>{t("workspace.openPresets")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
