import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
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
        }
      },
      boxShadow: {
        soft: "0 12px 34px -18px rgba(9, 20, 19, 0.32)"
      },
      borderRadius: {
        xl2: "1.25rem"
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        serif: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        sans: [
          "var(--font-sans)",
          "var(--font-geist-sans)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
};

export default config;
