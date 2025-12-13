import React from "react";

const INDICATORS = [
  { code: "SI.POV.GINI", label: "Gini index" },
  { code: "SI.DST.FRST.10", label: "Income share held by lowest 10%" },
  { code: "SI.DST.FRST.20", label: "Income share held by lowest 20%" },
  { code: "SI.DST.02ND.20", label: "Income share held by second 20%" },
  { code: "SI.DST.04TH.20", label: "Income share held by fourth 20%" },
  { code: "SI.DST.05TH.20", label: "Income share held by highest 20%" },
  { code: "SI.DST.10TH.10", label: "Income share held by highest 10%" },
];

export default function IndicatorSelector({ onSelect, disabled = false }) {
  return (
    <div>
      <label className="block mb-2 text-sm font-semibold text-slate-700">Inequality indicator</label>
      <select
        onChange={(e) => onSelect(e.target.value)}
        className="w-full border p-2 rounded bg-white"
        defaultValue=""
        disabled={disabled}
      >
        <option value="" disabled>
          Choose indicator
        </option>
        {INDICATORS.map((indicator) => (
          <option key={indicator.code} value={indicator.code}>
            {indicator.label}
          </option>
        ))}
      </select>
      {disabled && (
        <p className="text-xs text-slate-500 mt-1">
          Lorenz mode uses fixed quintile income-share indicators.
        </p>
      )}
    </div>
  );
}
