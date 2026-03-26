/**
 * EVision logo system — minimal "EV" lettermark.
 *
 * Variants:
 *   EVisionMark       — square EV badge, works at 16–80 px
 *   EVisionLogoFull   — mark + "EVision" wordmark, horizontal (navbar)
 *   EVisionLogoCompact — mark + short name (mobile / hero badge)
 */
import React, { useId } from "react";
import { useTheme } from "../context/ThemeContext";

/* ─────────────────────────────────────────────
   Core SVG mark — premium geometric "EV" lettermark.
   40×40 viewBox, scales cleanly from 16–64 px.
   Multi-layer bg depth + custom-drawn strokes.
───────────────────────────────────────────── */
function Mark({ size = 36, className = "" }) {
  const uid = useId().replace(/:/g, "_");
  const { theme } = useTheme();
  const dark = theme === "dark";

  // Palette switches per theme
  const bg1        = dark ? "#010d1f" : "#ffffff";
  const bg2        = dark ? "#040e1c" : "#f8fafc";
  const glow       = dark ? "#0d2a52" : "#dbeafe";
  const glowStop   = dark ? "#010d1f" : "#f8fafc";
  const shineC     = dark ? "#ffffff" : "#bfdbfe";
  const shineOp    = dark ? "0.08"    : "0.35";
  const bord1      = dark ? "#7dd3fc" : "#93c5fd";
  const bord1Op    = dark ? "0.40"    : "0.70";
  const bord2      = dark ? "#0ea5e9" : "#3b82f6";
  const bord2Op    = dark ? "0.10"    : "0.15";
  const bord3Op    = dark ? "0.30"    : "0.55";
  const fg1        = dark ? "#bae6fd" : "#1e3a8a";
  const fg2        = dark ? "#38bdf8" : "#1d4ed8";
  const fg3        = dark ? "#0ea5e9" : "#2563eb";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor={bg1} />
          <stop offset="1" stopColor={bg2} />
        </linearGradient>
        <radialGradient id={`${uid}_glow`} cx="50%" cy="50%" r="55%" gradientUnits="objectBoundingBox">
          <stop stopColor={glow} />
          <stop offset="1" stopColor={glowStop} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}_shine`} x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
          <stop stopColor={shineC} stopOpacity={shineOp} />
          <stop offset="1" stopColor={shineC} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}_border`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor={bord1} stopOpacity={bord1Op} />
          <stop offset="0.5" stopColor={bord2} stopOpacity={bord2Op} />
          <stop offset="1" stopColor={bord2} stopOpacity={bord3Op} />
        </linearGradient>
        <linearGradient id={`${uid}_fg`} x1="8" y1="10" x2="32" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor={fg1} />
          <stop offset="0.45" stopColor={fg2} />
          <stop offset="1" stopColor={fg3} />
        </linearGradient>
      </defs>

      {/* Layer 1 — base */}
      <rect width="40" height="40" rx="10" fill={`url(#${uid}_bg)`} />
      {/* Layer 2 — center glow */}
      <rect width="40" height="40" rx="10" fill={`url(#${uid}_glow)`} />
      {/* Layer 3 — top shine */}
      <rect width="40" height="20" rx="10" fill={`url(#${uid}_shine)`} />
      <rect x="0" y="10" width="40" height="10" fill={`url(#${uid}_shine)`} />
      {/* Layer 4 — border */}
      <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="9.5"
        fill="none" stroke={`url(#${uid}_border)`} strokeWidth="1.5" />

      {/* Letter "E" */}
      <g stroke={`url(#${uid}_fg)`} strokeWidth="2.2" strokeLinecap="round">
        <line x1="8"  y1="10.5" x2="8"    y2="29.5" />
        <line x1="8"  y1="10.5" x2="17"   y2="10.5" />
        <line x1="8"  y1="20"   x2="15.5" y2="20"   />
        <line x1="8"  y1="29.5" x2="17"   y2="29.5" />
      </g>
      {/* Letter "V" */}
      <g stroke={`url(#${uid}_fg)`} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="21,10.5 27,29.5 33,10.5" />
      </g>
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Wordmark — "EVision" with optional sub-kicker
───────────────────────────────────────────── */
function Wordmark({ size = "md", showKicker = true }) {
  const sizes = {
    sm: { title: "1rem",    kicker: "0.55rem" },
    md: { title: "1.25rem", kicker: "0.6rem"  },
    lg: { title: "1.6rem",  kicker: "0.63rem" },
  };
  const s = sizes[size] ?? sizes.md;

  return (
    <div className="flex flex-col justify-center leading-none select-none">
      <span
        style={{
          fontFamily: "Fraunces, 'Times New Roman', serif",
          fontSize: s.title,
          fontWeight: 600,
          lineHeight: 1,
          color: "var(--text)",
          letterSpacing: "-0.01em",
        }}
      >
        <span
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-strong))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          E
        </span>
        Vision
      </span>
      {showKicker && (
        <span
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: s.kicker,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--text-faint)",
            marginTop: "0.18em",
          }}
        >
          Economic Intelligence
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Public exports
───────────────────────────────────────────── */

/** Full horizontal logo: mark + wordmark. Use in Navbar. */
export function EVisionLogoFull({ markSize = 36, wordmarkSize = "md", className = "", animate = false, showKicker = true }) {
  return (
    <div
      className={[
        "flex items-center gap-2.5",
        animate ? "evision-logo-animate" : "",
        className,
      ].join(" ")}
    >
      <Mark size={markSize} className={animate ? "evision-mark-animate" : ""} />
      <Wordmark size={wordmarkSize} showKicker={showKicker} />
    </div>
  );
}

/** Compact: mark + short "EVision" text only. Mobile / hero badge. */
export function EVisionLogoCompact({ markSize = 30, className = "", animate = false }) {
  return (
    <div
      className={[
        "flex items-center gap-2",
        animate ? "evision-logo-animate" : "",
        className,
      ].join(" ")}
    >
      <Mark size={markSize} className={animate ? "evision-mark-animate" : ""} />
      <span
        style={{
          fontFamily: "Fraunces, 'Times New Roman', serif",
          fontSize: "1.05rem",
          fontWeight: 600,
          lineHeight: 1,
          color: "var(--text)",
          letterSpacing: "-0.01em",
        }}
        className="select-none"
      >
        <span
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-strong))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          E
        </span>
        Vision
      </span>
    </div>
  );
}

/** Mark only — square badge, favicon-preview or hero. */
export function EVisionMark({ size = 40, className = "", animate = false }) {
  return (
    <Mark
      size={size}
      className={[animate ? "evision-mark-animate" : "", className].join(" ")}
    />
  );
}

export default EVisionLogoFull;
