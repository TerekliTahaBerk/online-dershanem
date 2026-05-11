const TAG_BG: Record<string, string> = {
  GRAY: "#e5e7eb",
  BLUE: "#dbeafe",
  GREEN: "#d1fae5",
  YELLOW: "#fef3c7",
  ORANGE: "#fed7aa",
  RED: "#fecaca",
  PURPLE: "#e9d5ff",
  PINK: "#fbcfe8",
};
const TAG_FG: Record<string, string> = {
  GRAY: "#374151",
  BLUE: "#1e40af",
  GREEN: "#065f46",
  YELLOW: "#92400e",
  ORANGE: "#9a3412",
  RED: "#991b1b",
  PURPLE: "#6b21a8",
  PINK: "#9d174d",
};

export function TagBadge({ color, label, onRemove }: { color: string; label: string; onRemove?: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 999,
        background: TAG_BG[color] ?? TAG_BG.GRAY,
        color: TAG_FG[color] ?? TAG_FG.GRAY,
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {label}
      {onRemove}
    </span>
  );
}
