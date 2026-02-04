import React from "react";
import { Link } from "react-router-dom";

import { useTheme } from "../context/ThemeContext";

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="border-b border-slate-900/10 dark:border-white/10 bg-white/70 dark:bg-slate-950/70 backdrop-blur">
      <nav className="max-w-[1480px] mx-auto flex flex-col md:flex-row md:items-center justify-between px-6 py-6 gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-600/80 dark:text-slate-400/80">
            Inequality and macroeconomic intelligence
          </p>
          <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">
            <Link to="/" className="hover:text-slate-950 dark:hover:text-white transition">
              Economic Signals Studio
            </Link>
          </h1>
        </div>
        <div className="flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-slate-700/70 dark:text-slate-300/80">
          <a
            className="hover:text-slate-950 dark:hover:text-white transition"
            href="https://data.worldbank.org/indicator"
            target="_blank"
            rel="noreferrer"
          >
            World Bank
          </a>
          <a
            className="hover:text-slate-950 dark:hover:text-white transition"
            href="https://github.com/nuraidynseitkapar1"
            target="_blank"
            rel="noreferrer"
          >
            Lab Notes
          </a>
          <button
            type="button"
            className="btn-secondary"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </nav>
    </header>
  );
}
