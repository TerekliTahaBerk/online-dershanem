import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        // ─── Claude Design tokens (onaylı tasarım kaynağı) ───
        dc: {
          brand: "var(--dc-brand)",
          "brand-strong": "var(--dc-brand-strong)",
          "brand-hover": "var(--dc-brand-hover)",
          "brand-deep": "var(--dc-brand-deep)",
          "brand-soft": "var(--dc-brand-soft)",
          "brand-soft-line": "var(--dc-brand-soft-line)",
          ink: "var(--dc-ink)",
          "ink-body": "var(--dc-ink-body)",
          "ink-muted": "var(--dc-ink-muted)",
          "ink-faint": "var(--dc-ink-faint)",
          "ink-ghost": "var(--dc-ink-ghost)",
          canvas: "var(--dc-canvas)",
          surface: "var(--dc-surface)",
          "surface-muted": "var(--dc-surface-muted)",
          line: "var(--dc-line)",
          "line-soft": "var(--dc-line-soft)",
          "on-deep": "var(--dc-on-deep)",
          "on-deep-body": "var(--dc-on-deep-body)",
          "on-deep-muted": "var(--dc-on-deep-muted)",
          "on-deep-label": "var(--dc-on-deep-label)",
          "on-deep-faint": "var(--dc-on-deep-faint)",
          "on-deep-line": "var(--dc-on-deep-line)"
        },

        // Legacy site colors — preserved
        anchor: "#091413",
        ink: "#111111",
        pine: "#435633",
        brand: "#546B41",
        mint: "#DCCCAC",
        paper: "#FAFAF7",
        muted: "#2C3734",
        soft: "#EEF3EF",
        line: {
          DEFAULT: "rgba(9, 20, 19, 0.14)",
          strong: "rgba(40, 90, 72, 0.36)",
          soft: "rgba(9, 20, 19, 0.08)"
        },

        // ─── od-* design system tokens (theme-aware via CSS variables) ───
        od: {
          bg: "var(--pd-bg)",
          surface: "var(--pd-bg-elevated)",
          subtle: "var(--pd-bg-subtle)",
          "muted-bg": "var(--pd-bg-muted)",
          ink: "var(--pd-ink)",
          "ink-2": "var(--pd-ink-2)",
          "ink-3": "var(--pd-ink-3)",
          mute: "var(--pd-muted)",
          "mute-2": "var(--pd-muted-2)",
          border: "var(--pd-line)",
          "border-2": "var(--pd-line-2)",
          "border-strong": "var(--pd-line-strong)",
          accent: "var(--pd-accent)",
          "accent-hover": "var(--pd-accent-hover)",
          "accent-soft": "var(--pd-accent-soft)",
          "accent-chip": "var(--pd-accent-chip-bg)",
          "accent-chip-ink": "var(--pd-accent-chip-ink)",
          "sidebar-bg": "var(--pd-sidebar-bg)",
          "sidebar-line": "var(--pd-sidebar-line)",
          "sidebar-item": "var(--pd-sidebar-item)",
          "sidebar-item-hover": "var(--pd-sidebar-item-hover-bg)",
          "sidebar-item-active": "var(--pd-sidebar-item-active-bg)",
          "sidebar-item-active-ink": "var(--pd-sidebar-item-active-ink)",
          "sidebar-item-active-icon": "var(--pd-sidebar-item-active-icon)"
        },

        // Pastel palette (sitedeki tonlar) — info/warn/success/danger/special
        pastel: {
          sky:      { DEFAULT: "var(--pd-pastel-sky-bg)",      soft: "var(--pd-pastel-sky-soft)",      ink: "var(--pd-pastel-sky-ink)" },
          yellow:   { DEFAULT: "var(--pd-pastel-yellow-bg)",   soft: "var(--pd-pastel-yellow-soft)",   ink: "var(--pd-pastel-yellow-ink)" },
          mint:     { DEFAULT: "var(--pd-pastel-mint-bg)",     soft: "var(--pd-pastel-mint-soft)",     ink: "var(--pd-pastel-mint-ink)" },
          blush:    { DEFAULT: "var(--pd-pastel-blush-bg)",    soft: "var(--pd-pastel-blush-soft)",    ink: "var(--pd-pastel-blush-ink)" },
          lavender: { DEFAULT: "var(--pd-pastel-lavender-bg)", soft: "var(--pd-pastel-lavender-soft)", ink: "var(--pd-pastel-lavender-ink)" }
        }
      },
      boxShadow: {
        "dc-card": "var(--dc-shadow-card)",
        "dc-raised": "var(--dc-shadow-raised)",
        "dc-sticky": "var(--dc-shadow-sticky)",
        "dc-canvas": "var(--dc-shadow-canvas)",
        soft: "0 12px 34px -18px rgba(9, 20, 19, 0.32)",
        "od-sm": "var(--pd-shadow-sm)",
        "od-md": "var(--pd-shadow-md)",
        "od-lg": "var(--pd-shadow-lg)",
        "od-xl": "var(--pd-shadow-xl)"
      },
      borderRadius: {
        "dc-card": "var(--dc-radius-card)",
        "dc-card-sm": "var(--dc-radius-card-sm)",
        "dc-banner": "var(--dc-radius-banner)",
        xl2: "1.25rem",
        "od-sm": "6px",
        od: "10px",
        "od-lg": "16px",
        "od-xl": "24px"
      },
      fontFamily: {
        // Onaylı tasarım: başlık ve gövde Manrope, etiket JetBrains Mono.
        display: ["var(--font-manrope)", "var(--font-geist-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-manrope)", "var(--font-geist-sans)", "system-ui", "sans-serif"],
        sans: [
          "var(--font-manrope)",
          "var(--font-geist-sans)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      fontSize: {
        "od-display": ["36px", { lineHeight: "44px", letterSpacing: "-0.02em" }],
        "od-h1":      ["28px", { lineHeight: "36px", letterSpacing: "-0.018em" }],
        "od-h2":      ["22px", { lineHeight: "30px", letterSpacing: "-0.014em" }],
        "od-h3":      ["18px", { lineHeight: "26px", letterSpacing: "-0.011em" }],
        "od-body":    ["14px", { lineHeight: "22px" }],
        "od-small":   ["13px", { lineHeight: "20px" }],
        "od-tiny":    ["12px", { lineHeight: "18px" }]
      },
      keyframes: {
        "od-fade-in":  { from: { opacity: "0" },                                  to: { opacity: "1" } },
        "od-slide-up": { from: { opacity: "0", transform: "translateY(6px)" },    to: { opacity: "1", transform: "translateY(0)" } },
        "od-slide-in": { from: { opacity: "0", transform: "translateX(-6px)" },   to: { opacity: "1", transform: "translateX(0)" } }
      },
      animation: {
        "od-fade-in":  "od-fade-in 200ms ease-out",
        "od-slide-up": "od-slide-up 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        "od-slide-in": "od-slide-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1)"
      }
    }
  },
  plugins: []
};

export default config;
