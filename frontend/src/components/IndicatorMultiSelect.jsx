import React from "react";

export default function IndicatorMultiSelect({ indicators, onChange, selected }) {
  return (
    <div className="space-y-2">
      <label className="block text-xs uppercase tracking-widest text-slate-200/80">
        Indicators
      </label>
      <select
        multiple
        value={selected}
        onChange={(event) =>
          onChange(Array.from(event.target.selectedOptions, (opt) => opt.value))
        }
        className="input h-40"
      >
        {indicators.map((indicator) => (
          <option key={indicator.code} value={indicator.code}>
            {indicator.label || indicator.name}
          </option>
        ))}
      </select>
      <p className="text-[11px] text-slate-200/70">
        Choose multiple indicators to compare across the same countries and time range.
      </p>
    </div>
  );
}
