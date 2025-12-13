import React from "react";

const COUNTRIES = [
  { code: "KZ", name: "Kazakhstan" },
  { code: "RU", name: "Russia" },
  { code: "US", name: "United States" },
  { code: "CN", name: "China" },
  { code: "DE", name: "Germany" },
  { code: "JP", name: "Japan" },
];

export default function CountryMultiSelect({ onSelect }) {
  const handleChange = (event) => {
    const selected = Array.from(event.target.selectedOptions, (opt) => opt.value);
    onSelect(selected);
  };

  return (
    <div>
      <label className="block mb-2 text-sm font-semibold text-slate-700">
        Countries (select multiple with Ctrl/Cmd)
      </label>
      <select
        multiple
        onChange={handleChange}
        className="border p-2 rounded w-full h-32 bg-white focus:ring-2 focus:ring-blue-500"
      >
        {COUNTRIES.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </select>
    </div>
  );
}
