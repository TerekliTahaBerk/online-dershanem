import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import type { AcademicGap } from "@/lib/panel/academic-roadmap";

const AXIS_LABEL: Record<AcademicGap["axis"], string> = {
  net: "Net",
  score: "Puan",
  rank: "Sıralama",
  none: "—",
};

function fmt(v: number | null): string {
  if (v == null) return "—";
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(2).replace(/\.0+$/, "");
}

export function AcademicGapCard({ gap }: { gap: AcademicGap }) {
  if (!gap.comparable) {
    return (
      <Card>
        <CardHeader title="Hedefe kalan" />
        <CardBody>
          <div className="od-muted" style={{ fontSize: 13 }}>
            {gap.reason ?? "Hedef ve mevcut sonuç karşılaştırılamadı."}
          </div>
        </CardBody>
      </Card>
    );
  }

  // For rank, "lower is better" — but since we early-out when rank is the
  // axis (no current), we never render here. Net & score: target > current
  // means student must close the gap upward.
  const delta = gap.delta ?? 0;
  const isReached = delta <= 0;
  const tone = isReached ? "ok" : delta <= 5 ? "warn" : "bad";
  const arrow = isReached ? "✓" : "↑";
  const label = isReached
    ? `Hedefi geçtin (+${fmt(Math.abs(delta))})`
    : `Hedefe ${fmt(delta)} ${AXIS_LABEL[gap.axis].toLowerCase()} kaldı`;

  return (
    <Card>
      <CardHeader
        title="Hedefe kalan"
        subtitle={`Eksen: ${AXIS_LABEL[gap.axis]}`}
      />
      <CardBody>
        <div style={{ display: "grid", gap: 10 }}>
          <div className="od-row" style={{ gap: 8, alignItems: "center" }}>
            <Badge tone={tone}>{arrow} {label}</Badge>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}
          >
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                background: "var(--pd-soft)",
              }}
            >
              <div className="od-muted" style={{ fontSize: 11 }}>Hedef</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
                {fmt(gap.target)}
              </div>
            </div>
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                background: "var(--pd-soft)",
              }}
            >
              <div className="od-muted" style={{ fontSize: 11 }}>Mevcut</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
                {fmt(gap.current)}
              </div>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
