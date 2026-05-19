import React, { useEffect, useMemo, useState } from "react";

import { createPreset, deletePreset, listPresets, updatePreset } from "../api/presets";
import { useI18n } from "../context/I18nContext";

const safeStringArray = (value) =>
  Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];

const normalizePayload = (payload) => {
  const parsed = payload && typeof payload === "object" ? payload : {};
  return {
    selectedCountries: safeStringArray(parsed.selectedCountries),
    selectedIndicators: safeStringArray(parsed.selectedIndicators),
    chartType: typeof parsed.chartType === "string" ? parsed.chartType : "line",
    startYear: typeof parsed.startYear === "number" ? parsed.startYear : null,
    endYear: typeof parsed.endYear === "number" ? parsed.endYear : null,
  };
};

export default function SavedPresetsPanel({ user, currentPayload, onLoad, suggestedName = "" }) {
  const { t, language } = useI18n();
  const [presets, setPresets] = useState([]);
  const [name, setName] = useState("");
  const [userEdited, setUserEdited] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [status, setStatus] = useState({ loading: false, error: "", info: "" });

  useEffect(() => {
    if (suggestedName && !userEdited) {
      setName(suggestedName);
    }
  }, [suggestedName]);

  const canUse = Boolean(user);

  const existingByName = useMemo(() => {
    const map = new Map();
    presets.forEach((item) => map.set(item.name, item));
    return map;
  }, [presets]);

  const loadPresets = async () => {
    if (!canUse) { setPresets([]); return; }
    setStatus({ loading: true, error: "", info: "" });
    try {
      const data = await listPresets();
      setPresets(Array.isArray(data) ? data : []);
      setStatus({ loading: false, error: "", info: "" });
    } catch {
      setStatus({ loading: false, error: t("preset.errorLoad"), info: "" });
    }
  };

  useEffect(() => { loadPresets(); }, [canUse]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setStatus({ loading: false, error: t("preset.errorName"), info: "" }); return; }
    if (!canUse)  { setStatus({ loading: false, error: t("preset.errorSignIn"), info: "" }); return; }
    setStatus({ loading: true, error: "", info: "" });
    try {
      const payload = normalizePayload(currentPayload);
      const existing = existingByName.get(trimmed);
      if (existing && overwrite) {
        await updatePreset({ id: existing.id, name: trimmed, payload });
      } else {
        await createPreset({ name: trimmed, payload });
      }
      setName("");
      setUserEdited(false);
      setOverwrite(false);
      await loadPresets();
      setStatus({ loading: false, error: "", info: t("preset.saved") });
    } catch (err) {
      if (err?.response?.status === 409) {
        setStatus({ loading: false, error: t("preset.errorExists"), info: "" });
        return;
      }
      setStatus({ loading: false, error: t("preset.errorSave"), info: "" });
    }
  };

  const handleLoad = (preset) => {
    onLoad?.(normalizePayload(preset?.payload));
    setStatus({ loading: false, error: "", info: t("preset.loaded", { name: preset.name }) });
  };

  const handleDelete = async (preset) => {
    if (!preset?.id) return;
    setStatus({ loading: true, error: "", info: "" });
    try {
      await deletePreset(preset.id);
      await loadPresets();
      setStatus({ loading: false, error: "", info: t("preset.deleted") });
    } catch {
      setStatus({ loading: false, error: t("preset.errorDelete"), info: "" });
    }
  };

  const locale = language === "ru" ? "ru-RU" : language === "kz" ? "kk-KZ" : "en-US";

  if (!canUse) {
    return <p className="text-sm text-muted">{t("preset.signInHint")}</p>;
  }

  return (
    <div className="space-y-5">

      {/* ── Save form ── */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="label">{t("preset.name")}</label>
          <input
            className="input"
            value={name}
            onChange={(e) => { setName(e.target.value); setUserEdited(true); }}
            placeholder={t("preset.placeholder")}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={overwrite}
            onChange={(e) => setOverwrite(e.target.checked)}
          />
          {t("preset.overwrite")}
        </label>
        <button
          className="btn-secondary w-full"
          type="button"
          onClick={handleSave}
          disabled={status.loading}
        >
          {status.loading ? t("preset.saving") : t("preset.saveCurrent")}
        </button>

        {status.error && <p className="text-sm text-rose-400">{status.error}</p>}
        {status.info  && <p className="text-sm text-emerald-400">{status.info}</p>}
      </div>

      {/* ── Saved list ── */}
      <div className="border-t border-[var(--panel-border)] pt-4 space-y-2">
        {presets.length === 0 ? (
          <p className="text-sm text-muted">{t("preset.none")}</p>
        ) : (
          presets.map((preset) => (
            <div key={preset.id} className="surface rounded-lg px-4 py-3 space-y-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{preset.name}</p>
                <p className="text-xs text-muted mt-0.5">
                  {t("preset.updated", {
                    date: new Date(preset.updated_at).toLocaleString(locale),
                  })}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn-secondary flex-1"
                  type="button"
                  onClick={() => handleLoad(preset)}
                >
                  {t("preset.load")}
                </button>
                <button
                  className="btn-secondary flex-1"
                  type="button"
                  onClick={() => handleDelete(preset)}
                  disabled={status.loading}
                >
                  {t("preset.delete")}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
