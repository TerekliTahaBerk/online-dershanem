/**
 * FAZ 8 — Analytics UI components.
 *
 * Pure presentational. Hiçbiri DB sorgusu yapmaz.
 * Tümü server-component-uyumlu (no client hooks).
 */

import type { Insight, InsightSeverity } from "@/lib/analytics/insights";
import type { RiskLevel } from "@/lib/analytics/risk";

/* ── InsightCard ────────────────────────────────────────────────────────── */

const SEVERITY_STYLE: Record<InsightSeverity, { bg: string; fg: string; border: string }> = {
  danger: { bg: "#fdecea", fg: "#b94a48", border: "#f5c2c0" },
  warn: { bg: "#fff8e1", fg: "#8a6d3b", border: "#f3e0a8" },
  positive: { bg: "#e6f4ea", fg: "#2e7d32", border: "#bfe0c6" },
  info: { bg: "#eef3fb", fg: "#1f4e8f", border: "#cad8ee" },
};

export function InsightCard({ insight }: { insight: Insight }) {
  const s = SEVERITY_STYLE[insight.severity];
  return (
    <div
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.fg,
        padding: "10px 12px",
        borderRadius: 10,
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <div style={{ fontSize: 22, lineHeight: 1, flex: "0 0 28px" }}>{insight.icon}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{insight.title}</div>
        <div style={{ fontSize: 12, lineHeight: 1.45 }}>{insight.body}</div>
        {insight.hint ? (
          <div style={{ fontSize: 11, marginTop: 4, opacity: 0.75 }}>↳ {insight.hint}</div>
        ) : null}
      </div>
    </div>
  );
}

export function InsightList({ insights, emptyText = "Yeterli veri yok, henüz yorum üretilemiyor." }: { insights: Insight[]; emptyText?: string }) {
  if (insights.length === 0) {
    return (
      <div style={{ padding: "12px 14px", color: "var(--pd-muted)", fontSize: 13, background: "var(--pd-bg-soft, #f6f4f0)", borderRadius: 10 }}>
        {emptyText}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {insights.map((i) => <InsightCard key={i.id} insight={i} />)}
    </div>
  );
}

/* ── RiskBadge ──────────────────────────────────────────────────────────── */

const RISK_STYLE: Record<RiskLevel, { bg: string; fg: string; label: string }> = {
  high: { bg: "#fdecea", fg: "#b94a48", label: "Yüksek risk" },
  medium: { bg: "#fff8e1", fg: "#8a6d3b", label: "Orta risk" },
  low: { bg: "#e6f4ea", fg: "#2e7d32", label: "Düşük risk" },
};

export function RiskBadge({ level, score }: { level: RiskLevel; score?: number }) {
  const s = RISK_STYLE[level];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: s.bg,
        color: s.fg,
        padding: "2px 8px",
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      ● {s.label}
      {score !== undefined ? <span style={{ opacity: 0.7 }}>· {score}</span> : null}
    </span>
  );
}

/* ── ProgressBar ────────────────────────────────────────────────────────── */

export function ProgressBar({
  value,
  max = 100,
  tone = "accent",
  label,
  height = 8,
}: {
  value: number;
  max?: number;
  tone?: "accent" | "ok" | "warn" | "bad" | "neutral";
  label?: React.ReactNode;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(100, Math.round((value / Math.max(1, max)) * 100)));
  const color =
    tone === "ok" ? "#2e7d32"
    : tone === "warn" ? "#a36a00"
    : tone === "bad" ? "#b94a48"
    : tone === "neutral" ? "#8a8580"
    : "var(--pd-accent, #4a7eb0)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label ? <div style={{ fontSize: 12, color: "var(--pd-muted)" }}>{label}</div> : null}
      <div style={{ background: "var(--pd-bg-soft, #f0ece4)", borderRadius: 999, height, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width .3s ease" }} />
      </div>
    </div>
  );
}

/* ── StatCard ───────────────────────────────────────────────────────────── */

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "accent" | "ok" | "warn" | "bad" | "neutral";
}) {
  const accent =
    tone === "ok" ? "#2e7d32"
    : tone === "warn" ? "#a36a00"
    : tone === "bad" ? "#b94a48"
    : tone === "accent" ? "var(--pd-accent, #4a7eb0)"
    : "var(--pd-muted, #8a8580)";
  return (
    <div className="od-card" style={{ padding: 14, borderTop: `3px solid ${accent}` }}>
      <div style={{ fontSize: 11, color: "var(--pd-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{value}</div>
      {hint ? <div style={{ fontSize: 12, color: "var(--pd-muted)", marginTop: 4 }}>{hint}</div> : null}
    </div>
  );
}

/* ── TrendCard (mini bar/sparkline) ─────────────────────────────────────── */

export function TrendCard({
  title,
  data,
  format = "int",
  height = 60,
  color = "var(--pd-accent, #4a7eb0)",
}: {
  title: React.ReactNode;
  data: number[];
  format?: "int" | "float1";
  height?: number;
  color?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="od-card" style={{ padding: 14 }}>
        <div style={{ fontSize: 12, color: "var(--pd-muted)" }}>{title}</div>
        <div style={{ fontSize: 13, color: "var(--pd-muted)", marginTop: 8 }}>Veri yok</div>
      </div>
    );
  }
  const last = data[data.length - 1];
  const prev = data.length > 1 ? data[data.length - 2] : null;
  const delta = prev !== null ? last - prev : null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const fmt = (v: number) => format === "float1" ? v.toFixed(1) : Math.round(v).toString();

  const w = 220;
  const h = height;
  const pts = data.map((v, i) => [
    (i / Math.max(1, data.length - 1)) * w,
    h - ((v - min) / range) * (h - 6) - 3,
  ] as const);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${path} L${w} ${h} L0 ${h} Z`;

  return (
    <div className="od-card" style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 12, color: "var(--pd-muted)" }}>{title}</div>
        {delta !== null ? (
          <div style={{ fontSize: 11, color: delta > 0 ? "#2e7d32" : delta < 0 ? "#b94a48" : "var(--pd-muted)" }}>
            {delta > 0 ? "↑" : delta < 0 ? "↓" : "→"} {fmt(Math.abs(delta))}
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{fmt(last)}</div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height, marginTop: 4 }}>
        <path d={area} fill={color} opacity={0.15} />
        <path d={path} stroke={color} strokeWidth={1.5} fill="none" />
      </svg>
    </div>
  );
}

/* ── BarList ────────────────────────────────────────────────────────────── */

export function BarList({
  rows,
  format = "int",
  maxOverride,
  emptyText = "Veri yok",
}: {
  rows: Array<{ label: React.ReactNode; value: number; meta?: React.ReactNode; tone?: "accent" | "ok" | "warn" | "bad" }>;
  format?: "int" | "pct" | "float1";
  maxOverride?: number;
  emptyText?: string;
}) {
  if (rows.length === 0) {
    return <div style={{ padding: 12, color: "var(--pd-muted)", fontSize: 13 }}>{emptyText}</div>;
  }
  const max = maxOverride ?? Math.max(...rows.map((r) => r.value), 1);
  const fmt = (v: number) =>
    format === "pct" ? `%${Math.round(v)}` :
    format === "float1" ? v.toFixed(1) :
    Math.round(v).toString();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((r, idx) => (
        <div key={idx}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{r.label}</span>
            <span className="od-mono" style={{ color: "var(--pd-muted)" }}>
              {r.meta} {fmt(r.value)}
            </span>
          </div>
          <ProgressBar value={r.value} max={max} tone={r.tone ?? "accent"} height={6} />
        </div>
      ))}
    </div>
  );
}

/* ── Heatmap (basit hücreli) ───────────────────────────────────────────── */

export function Heatmap({
  rows,
  emptyText = "Veri yok",
}: {
  rows: Array<{ label: React.ReactNode; value: number; total?: number; href?: string }>;
  emptyText?: string;
}) {
  if (rows.length === 0) {
    return <div style={{ padding: 12, color: "var(--pd-muted)", fontSize: 13 }}>{emptyText}</div>;
  }
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
      {rows.map((r, i) => {
        const intensity = r.value / max; // 0-1
        const bg = `rgba(185, 74, 72, ${0.15 + intensity * 0.55})`;
        return (
          <div
            key={i}
            style={{
              background: bg,
              borderRadius: 8,
              padding: "10px 12px",
              border: "1px solid rgba(185,74,72,0.2)",
              fontSize: 12,
              minHeight: 56,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
            title={r.total !== undefined ? `${r.value} / ${r.total}` : String(r.value)}
          >
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</div>
            <div className="od-mono" style={{ fontWeight: 600 }}>
              {r.value}
              {r.total !== undefined ? <span style={{ opacity: 0.6 }}> / {r.total}</span> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── AnalyticsTable (lite) ──────────────────────────────────────────────── */

export function AnalyticsTable<T>({
  rows,
  columns,
  emptyText = "Kayıt yok",
  rowKey,
}: {
  rows: T[];
  columns: Array<{ key: string; header: React.ReactNode; render: (r: T) => React.ReactNode; align?: "left" | "right" | "center"; width?: number | string }>;
  emptyText?: string;
  rowKey: (r: T) => string;
}) {
  if (rows.length === 0) {
    return <div style={{ padding: 12, color: "var(--pd-muted)", fontSize: 13 }}>{emptyText}</div>;
  }
  return (
    <table className="od-table" style={{ fontSize: 12 }}>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} style={{ textAlign: c.align ?? "left", width: c.width }}>{c.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={rowKey(r)}>
            {columns.map((c) => (
              <td key={c.key} style={{ textAlign: c.align ?? "left" }}>{c.render(r)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
