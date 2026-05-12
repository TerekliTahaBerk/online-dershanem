type Props = {
  data: number[];
  color?: string;
  height?: number;
  fill?: boolean;
};

export function Sparkline({ data, color = "var(--pd-accent)", height = 36, fill = true }: Props) {
  if (!data.length) return null;
  const w = 140;
  const h = height;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return [x, y] as const;
  });
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${d} L${w} ${h} L0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: h }}>
      {fill ? <path d={area} fill={color} opacity={0.12} /> : null}
      <path d={d} stroke={color} strokeWidth={1.5} fill="none" />
    </svg>
  );
}
