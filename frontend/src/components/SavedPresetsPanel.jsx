import React, { useEffect, useMemo, useState } from "react";

import { createPreset, deletePreset, listPresets, updatePreset } from "../api/presets";

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
      setStatus({ loading: false, error: "Unable to load saved presets.", info: "" });
    }
  };

  useEffect(() => {
    loadPresets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUse]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setStatus({ loading: false, error: "Enter a preset name.", info: "" });
      return;
    }
    if (!canUse) {
      setStatus({ loading: false, error: "Sign in to save presets.", info: "" });
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
      setStatus({ loading: false, error: "", info: "Preset saved." });
    } catch (err) {
      const httpStatus = err?.response?.status;
      if (httpStatus === 409) {
        setStatus({
          loading: false,
          error: "Preset name already exists. Enable overwrite to replace it.",
          info: "",
        });
        return;
      }
      setStatus({ loading: false, error: "Failed to save preset.", info: "" });
    }
  };

  const handleLoad = (preset) => {
    const payload = normalizePayload(preset?.payload);
    onLoad?.(payload);
    setStatus({ loading: false, error: "", info: `Loaded: ${preset.name}` });
  };

  const handleDelete = async (preset) => {
    if (!preset?.id) return;
    setStatus({ loading: true, error: "", info: "" });
    try {
      await deletePreset(preset.id);
      await loadPresets();
      setStatus({ loading: false, error: "", info: "Preset deleted." });
    } catch (err) {
      setStatus({ loading: false, error: "Failed to delete preset.", info: "" });
    }
  };

  return (
    <div className="panel">
      <h3 className="panel-title">Saved presets</h3>
      {!canUse ? (
        <p className="text-xs text-slate-200/70 mt-2">Sign in to save and restore analysis setups.</p>
      ) : (
        <div className="space-y-3 mt-4">
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-widest text-slate-200/80">
              Preset name
            </label>
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. KZ vs RU · Gini + inflation"
            />
            <label className="flex items-center gap-2 text-xs text-slate-200/80">
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(event) => setOverwrite(event.target.checked)}
              />
              Overwrite if name exists
            </label>
            <button className="btn-secondary" type="button" onClick={handleSave} disabled={status.loading}>
              {status.loading ? "Saving..." : "Save current selection"}
            </button>
          </div>

          {status.error && <p className="text-xs text-rose-200/90">{status.error}</p>}
          {status.info && <p className="text-xs text-emerald-200/90">{status.info}</p>}

          <div className="pt-2 border-t border-white/10">
            {presets.length === 0 ? (
              <p className="text-xs text-slate-200/70">No presets saved yet.</p>
            ) : (
              <div className="space-y-2">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100/15 bg-slate-900/40 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{preset.name}</p>
                      <p className="text-[11px] text-slate-200/70">
                        Updated {new Date(preset.updated_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="btn-secondary" type="button" onClick={() => handleLoad(preset)}>
                        Load
                      </button>
                      <button
                        className="btn-secondary"
                        type="button"
                        onClick={() => handleDelete(preset)}
                        disabled={status.loading}
                      >
                        Delete
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

