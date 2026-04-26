/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        accent: "var(--accent)",
        "accent-2": "var(--accent-2)",
        "accent-3": "var(--accent-3)",
        canvas: "var(--canvas)",
        panel: "var(--panel)",
        "text-base": "var(--text)",
        "text-dim": "var(--text-dim)",
        "text-faint": "var(--text-faint)",
        success: "var(--c-success)",
        warning: "var(--c-warning)",
        danger: "var(--c-danger)",
        info: "var(--c-info)",
      },
      fontFamily: {
        body:    ["var(--font-body)"],
        display: ["var(--font-display)"],
        mono:    ["var(--font-mono)"],
      },
      borderRadius: {
        sm:  "var(--r-sm)",
        md:  "var(--r-md)",
        lg:  "var(--r-lg)",
        xl:  "var(--r-xl)",
        "2xl": "var(--r-2xl)",
        pill: "var(--r-pill)",
      },
      boxShadow: {
        xs:    "var(--shadow-xs)",
        sm:    "var(--shadow-sm)",
        md:    "var(--shadow-md)",
        lg:    "var(--shadow-lg)",
        xl:    "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
        glow:  "var(--shadow-glow)",
        "glow-sm": "var(--shadow-glow-sm)",
      },
      transitionDuration: {
        micro: "120ms",
        fast:  "200ms",
        base:  "320ms",
        slow:  "480ms",
      },
      transitionTimingFunction: {
        "ease-out-spring": "cubic-bezier(0.16, 1, 0.3, 1)",
        "ease-ui":         "cubic-bezier(0.4, 0, 0.2, 1)",
        "ease-bounce":     "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};
