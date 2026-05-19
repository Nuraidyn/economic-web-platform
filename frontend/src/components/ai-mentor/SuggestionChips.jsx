import React from "react";

export default function SuggestionChips({ suggestions = [], onSelect, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-8 w-36 rounded-lg" />
        ))}
      </div>
    );
  }

  const unique = [...new Set(suggestions.map((s) => s.trim()).filter(Boolean))];
  if (!unique.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {unique.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSelect(s)}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--panel-border-strong)",
            borderRadius: "var(--r-md)",
            color: "var(--text)",
            fontSize: "0.8125rem",
            lineHeight: "1.4",
            padding: "0.375rem 0.75rem",
            cursor: "pointer",
            transition: "border-color 0.15s, background 0.15s",
            textAlign: "left",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--accent)";
            e.currentTarget.style.background = "var(--surface-hover, var(--surface))";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--panel-border-strong)";
            e.currentTarget.style.background = "var(--surface)";
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
