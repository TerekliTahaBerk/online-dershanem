import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import type { OdkResultDetail } from "@/lib/panel/odk-student";

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m} dk ${s} sn`;
}

export function OdkResultSummaryCard({ detail }: { detail: OdkResultDetail }) {
  const net = detail.net != null ? detail.net.toFixed(2) : "—";
  return (
    <Card>
      <CardHeader
        title="Sonuç özeti"
        subtitle={`${detail.cadenceFamily}${
          detail.classLevel ? ` · ${detail.classLevel}. sınıf` : ""
        } · ${formatDuration(detail.durationSeconds)} kullanıldı / ${detail.durationMinutes} dk süre`}
        right={
          detail.autoSubmitted ? (
            <Badge tone="warn">Otomatik teslim</Badge>
          ) : (
            <Badge tone="ok">Tamamlandı</Badge>
          )
        }
      />
      <CardBody>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0,1fr))",
            gap: 8,
          }}
        >
          <KpiBox label="Net" value={net} tone="primary" />
          <KpiBox
            label="Doğru"
            value={String(detail.correctCount)}
            tone="ok"
          />
          <KpiBox label="Yanlış" value={String(detail.wrongCount)} tone="bad" />
          <KpiBox
            label="Boş"
            value={String(detail.blankCount)}
            tone="neutral"
          />
        </div>
        {detail.cheatViolationCount >= 2 ? (
          <div style={{ marginTop: 12, fontSize: 12 }}>
            <Badge tone="bad">{detail.cheatViolationCount} ihlal</Badge>{" "}
            <span className="od-muted">
              Sınav süresince sekme değişimi, kopyala-yapıştır veya benzer
              kural ihlalleri tespit edildi. Detayları öğretmenin
              görüntüleyebilir.
            </span>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

function KpiBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "ok" | "bad" | "neutral";
}) {
  const colors = {
    primary: { bg: "#eff6ff", color: "#1e40af" },
    ok: { bg: "#dcfce7", color: "#166534" },
    bad: { bg: "#fee2e2", color: "#991b1b" },
    neutral: { bg: "#f1f5f9", color: "#475569" },
  }[tone];
  return (
    <div
      style={{
        background: colors.bg,
        color: colors.color,
        padding: 12,
        borderRadius: 10,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}
