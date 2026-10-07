/**
 * Küçük çizgi grafik — bağlamsal eğilim için (roadmap §5.9). Her zaman bir
 * metin özetiyle birlikte kullanılır; grafik `role="img"` ve tam değer listesi
 * içeren erişilebilir adla çizilir. Renk ürün vurgusundan gelir.
 */
export function Sparkline({
  values,
  label,
  width = 160,
  height = 36,
}: {
  values: number[];
  /** Ekran okuyucu metni, ör. "Toplam net: D1 52, D2 58". */
  label: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const pad = 4;
  const points = values.map((value, index) => ({
    x: Math.round(index * step * 10) / 10,
    y: Math.round((height - pad - ((value - min) / span) * (height - pad * 2)) * 10) / 10,
  }));
  const last = points[points.length - 1];
  return (
    <svg
      viewBox={`-${pad} 0 ${width + pad * 2} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={label}
      className="shrink-0 overflow-visible"
    >
      <polyline
        points={points.map((point) => `${point.x},${point.y}`).join(" ")}
        fill="none"
        stroke="var(--pn-accent-marker, var(--dc-brand))"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last.x} cy={last.y} r="3" fill="var(--pn-accent, var(--dc-brand-strong))" />
    </svg>
  );
}
