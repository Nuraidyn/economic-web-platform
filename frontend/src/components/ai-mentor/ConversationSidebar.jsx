import React from "react";

function formatRelative(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export default function ConversationSidebar({
  conversations = [],
  activeId,
  onSelect,
  onNew,
  onDelete,
  isLoading,
}) {
  return (
    <aside className="flex flex-col h-full">
      <div className="p-3 border-b border-[var(--panel-border)]">
        <button
          type="button"
          className="btn-primary w-full py-2"
          onClick={onNew}
        >
          + New Conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {isLoading && (
          <div className="space-y-2 px-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton skeleton-text w-full h-8 rounded" />
            ))}
          </div>
        )}

        {!isLoading && conversations.length === 0 && (
          <p className="text-sm text-[var(--text-faint)] text-center mt-8 px-4">
            No conversations yet
          </p>
        )}

        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`group flex items-start justify-between gap-2 px-3 py-2.5 mx-2 rounded-lg cursor-pointer transition-colors ${
              conv.id === activeId
                ? "bg-[var(--tab-active-bg)]"
                : "hover:bg-[var(--surface-hover)]"
            }`}
            onClick={() => onSelect(conv.id)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{conv.title}</p>
              <p className="text-xs text-[var(--text-faint)] mt-0.5">
                {formatRelative(conv.updated_at)} · {conv.message_count} msg
              </p>
            </div>
            <button
              type="button"
              className="opacity-0 group-hover:opacity-100 text-[var(--text-faint)] hover:text-rose-400 text-sm flex-shrink-0 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conv.id);
              }}
              aria-label="Delete conversation"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
