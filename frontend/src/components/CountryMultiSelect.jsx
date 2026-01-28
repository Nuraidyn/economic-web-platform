import React from "react";

export default function CountryMultiSelect({ countries, onSelect, selected }) {
  const handleChange = (event) => {
    const selectedValues = Array.from(event.target.selectedOptions, (opt) => opt.value);
    onSelect(selectedValues);
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs uppercase tracking-widest text-slate-200/80">
        Countries
      </label>
      <select
        multiple
        value={selected}
        onChange={handleChange}
        className="input h-40"
      >
        {countries.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </select>
      <p className="text-[11px] text-slate-200/70">
        Multi-select countries to compare inequality and macroeconomic signals side by side.
      </p>
    </div>
  );
}
