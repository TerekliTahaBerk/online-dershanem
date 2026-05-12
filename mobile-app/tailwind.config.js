/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Brand
        brand: {
          DEFAULT: "#7C5CFF",
          50: "#F2EEFF",
          100: "#E2D9FF",
          200: "#C5B3FF",
          300: "#A88DFF",
          400: "#8B68FF",
          500: "#7C5CFF",
          600: "#5E3DE0",
          700: "#4327B0",
          800: "#2C1880",
          900: "#1A0E55",
        },
        // Surface (dark-first)
        bg: {
          DEFAULT: "#0B0B10",
          subtle: "#11121A",
          card: "#161823",
          elev: "#1D2030",
          border: "#262A3D",
        },
        ink: {
          DEFAULT: "#F4F5FA",
          muted: "#9AA0B4",
          dim: "#6B7088",
        },
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#38BDF8",
      },
      fontFamily: {
        sans: ["Inter", "System"],
        display: ["Inter", "System"],
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "28px",
      },
    },
  },
  plugins: [],
};
