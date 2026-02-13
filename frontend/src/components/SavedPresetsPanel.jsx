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

export default function SavedPresetsPanel({ user, currentPayload, onLoad }) {
  const { t, language } = useI18n();
  const [presets, setPresets] = useState([]);
  const [name, setName] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [status, setStatus] = useState({ loading: false, error: "", info: "" });

  const canUse = Boolean(user);

  const existingByName = useMemo(() => {
    const map = new Map();
    presets.forEach((item) => map.set(item.name, item));
    return map;
  }, [presets]);

  const loadPresets = async () => {
    if (!canUse) {
      setPresets([]);
      return;
    }
    setStatus({ loading: true, error: "", info: "" });
    try {
      const data = await listPresets();
      setPresets(Array.isArray(data) ? data : []);
      setStatus({ loading: false, error: "", info: "" });
    } catch (err) {
      setStatus({ loading: false, error: t("preset.errorLoad"), info: "" });
    }
  };

  useEffect(() => {
    loadPresets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUse]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setStatus({ loading: false, error: t("preset.errorName"), info: "" });
      return;
    }
    if (!canUse) {
      setStatus({ loading: false, error: t("preset.errorSignIn"), info: "" });
      return;
    }
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
      setOverwrite(false);
      await loadPresets();
      setStatus({ loading: false, error: "", info: t("preset.saved") });
    } catch (err) {
      const httpStatus = err?.response?.status;
      if (httpStatus === 409) {
        setStatus({
          loading: false,
          error: t("preset.errorExists"),
          info: "",
        });
        return;
      }
      setStatus({ loading: false, error: t("preset.errorSave"), info: "" });
    }
  };

  const handleLoad = (preset) => {
    const payload = normalizePayload(preset?.payload);
    onLoad?.(payload);
    setStatus({ loading: false, error: "", info: t("preset.loaded", { name: preset.name }) });
  };

  const handleDelete = async (preset) => {
    if (!preset?.id) return;
    setStatus({ loading: true, error: "", info: "" });
    try {
      await deletePreset(preset.id);
      await loadPresets();
      setStatus({ loading: false, error: "", info: t("preset.deleted") });
    } catch (err) {
      setStatus({ loading: false, error: t("preset.errorDelete"), info: "" });
    }
  };

  return (
    <div className="panel">
      <h3 className="panel-title">{t("preset.title")}</h3>
      {!canUse ? (
        <p className="text-xs text-muted mt-2">{t("preset.signInHint")}</p>
      ) : (
        <div className="space-y-3 mt-4">
          <div className="space-y-2">
            <label className="label">{t("preset.name")}</label>
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("preset.placeholder")}
            />
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(event) => setOverwrite(event.target.checked)}
              />
              {t("preset.overwrite")}
            </label>
            <button className="btn-secondary" type="button" onClick={handleSave} disabled={status.loading}>
              {status.loading ? t("preset.saving") : t("preset.saveCurrent")}
            </button>
          </div>

          {status.error && <p className="text-xs text-rose-200/90">{status.error}</p>}
          {status.info && <p className="text-xs text-emerald-200/90">{status.info}</p>}

          <div className="pt-2 border-t border-slate-900/10 dark:border-white/10">
            {presets.length === 0 ? (
              <p className="text-xs text-muted">{t("preset.none")}</p>
            ) : (
              <div className="space-y-2">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between gap-3 surface px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{preset.name}</p>
                      <p className="text-[11px] text-muted">
                        {t("preset.updated", {
                          date: new Date(preset.updated_at).toLocaleString(
                            language === "ru" ? "ru-RU" : language === "kz" ? "kk-KZ" : "en-US"
                          ),
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="btn-secondary" type="button" onClick={() => handleLoad(preset)}>
                        {t("preset.load")}
                      </button>
                      <button
                        className="btn-secondary"
                        type="button"
                        onClick={() => handleDelete(preset)}
                        disabled={status.loading}
                      >
                        {t("preset.delete")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
