import React from "react";

export default function SuggestionChips({ suggestions = [], onSelect, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-7 w-32 rounded-full" />
        ))}
      </div>
    );
  }
  if (!suggestions.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((s, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(s)}
          className="tab text-xs px-3 py-1 hover:bg-accent transition-colors cursor-pointer"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
