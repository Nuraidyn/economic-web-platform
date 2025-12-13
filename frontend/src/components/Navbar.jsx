import React from "react";

export default function Navbar() {
  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">
            The Lorenz Curve &amp; Gini Index
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Income Inequality Explorer
          </h1>
        </div>
        <div className="text-sm text-slate-500 space-x-4">
          <a
            className="hover:text-slate-900 transition"
            href="https://data.worldbank.org/indicator"
            target="_blank"
            rel="noreferrer"
          >
            Indicator Catalog
          </a>
          <a
            className="hover:text-slate-900 transition"
            href="https://github.com/nuraidynseitkapar1"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </nav>
    </header>
  );
}
