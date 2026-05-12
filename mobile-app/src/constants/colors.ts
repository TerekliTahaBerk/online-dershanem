/**
 * Tasarım tokenleri — design system'in tek kaynağı.
 * NativeWind tarafında tailwind.config.js ile senkron tutulur.
 */
export const palette = {
  brand: "#7C5CFF",
  brandSoft: "#A88DFF",
  bg: "#0B0B10",
  bgSubtle: "#11121A",
  card: "#161823",
  elev: "#1D2030",
  border: "#262A3D",
  ink: "#F4F5FA",
  inkMuted: "#9AA0B4",
  inkDim: "#6B7088",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#38BDF8",
} as const;

export type PaletteKey = keyof typeof palette;
