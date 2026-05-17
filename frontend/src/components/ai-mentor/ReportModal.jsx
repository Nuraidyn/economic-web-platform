import React, { useRef } from "react";

export default function ReportModal({ isOpen, onClose, markdown, isLoading }) {
  const preRef = useRef(null);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (markdown) navigator.clipboard.writeText(markdown);
  };

  const handleDownload = () => {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "economic-report.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="surface rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--panel-border)]">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--text-faint)]">
            Economic Report
          </h2>
          <div className="flex items-center gap-2">
            <button type="button" className="tab text-xs px-3 py-1" onClick={handleCopy}>
              Copy
            </button>
            <button type="button" className="tab text-xs px-3 py-1" onClick={handleDownload}>
              Download .md
            </button>
            <button type="button" className="text-[var(--text-faint)] hover:text-[var(--text)] text-sm px-2" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`skeleton skeleton-text ${i % 2 === 0 ? "w-4/5" : "w-full"}`} />
              ))}
            </div>
          ) : (
            <pre ref={preRef} className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
              {markdown}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
