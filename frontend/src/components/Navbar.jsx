import React from "react";

export default function Navbar() {
  return (
    <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
      <nav className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between px-6 py-6 gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400/80">
            Inequality and macroeconomic intelligence
          </p>
          <h1 className="text-3xl font-semibold text-white">
            Economic Signals Studio
          </h1>
        </div>
        <div className="text-xs uppercase tracking-[0.2em] text-slate-300/80 flex gap-4">
          <a
            className="hover:text-white transition"
            href="https://data.worldbank.org/indicator"
            target="_blank"
            rel="noreferrer"
          >
            World Bank
          </a>
          <a
            className="hover:text-white transition"
            href="https://github.com/nuraidynseitkapar1"
            target="_blank"
            rel="noreferrer"
          >
            Lab Notes
          </a>
        </div>
      </nav>
    </header>
  );
}
