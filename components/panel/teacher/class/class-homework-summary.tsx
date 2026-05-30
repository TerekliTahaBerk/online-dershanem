import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import {
  getAssignmentStatusLabel,
  getAssignmentStatusTone,
} from "@/lib/homework";
import type { ClassHomeworkSummary } from "@/lib/teacher-dashboard";

const DATE_FMT = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" });

const TONE_MAP: Record<string, "ok" | "warn" | "bad" | "neutral" | "teal"> = {
  ok: "ok", warn: "warn", bad: "bad", neutral: "neutral", teal: "teal",
};

type Props = { classroomId: string; summary: ClassHomeworkSummary };

export function ClassHomeworkSummaryCard({ classroomId, summary }: Props) {
  return (
    <Card>
      <CardHeader
        title="Ödev özeti"
        subtitle={`${summary.activeCount} aktif ödev`}
        right={
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Link href={`/panel/ogretmen/odevler/yeni?classroomId=${classroomId}`} className="od-btn od-btn-primary od-btn-sm">
              + Ödev oluştur
            </Link>
            <Link href={`/panel/ogretmen/odevler?classroomId=${classroomId}`} className="od-btn od-btn-ghost od-btn-sm">
              Tüm ödevler →
            </Link>
          </div>
        }
      />
      <CardBody>
        {summary.activeCount === 0 ? (
          <EmptyState
            icon="assignment"
            title="Bu sınıfa atanmış ödev yok."
            description="İlk ödevi oluştur ve sınıfla paylaş."
            action={
              <Link href={`/panel/ogretmen/odevler/yeni?classroomId=${classroomId}`} className="od-btn od-btn-primary od-btn-sm">
                + Ödev oluştur
              </Link>
            }
          />
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginBottom: 12 }}>
              <Stat label="Toplam teslim" value={summary.totalSubmissions} />
              <Stat label="Kontrol bekleyen" value={summary.ungradedCount} tone={summary.ungradedCount > 0 ? "warn" : undefined} />
              <Stat label="Geciken" value={summary.overdueCount} tone={summary.overdueCount > 0 ? "bad" : undefined} />
              <Stat label="Eksik teslim" value={summary.missedCount} tone={summary.missedCount > 0 ? "bad" : undefined} />
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--pd-muted)", textTransform: "uppercase", letterSpacing: 0.6, margin: "6px 0" }}>
              Yaklaşan / aktif ödevler
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {summary.recent.map((r) => {
                const tone = TONE_MAP[getAssignmentStatusTone(r.operationalStatus)] ?? "neutral";
                return (
                  <Link
                    key={r.assignmentId}
                    href={`/panel/ogretmen/odevler/${r.assignmentId}`}
                    style={{
                      display: "grid", gridTemplateColumns: "1fr auto", gap: 8,
                      padding: "8px 10px", borderRadius: 6, background: "var(--pd-soft)",
                      color: "inherit", textDecoration: "none",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.title}
                      </div>
                      <div className="od-muted" style={{ fontSize: 11, display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                        <span>{r.submittedCount}/{r.expected} teslim</span>
                        {r.ungradedCount > 0 ? <span>· {r.ungradedCount} bekliyor</span> : null}
                        {r.missedCount > 0 ? <span>· {r.missedCount} eksik</span> : null}
                        {r.dueAt ? <span>· son {DATE_FMT.format(r.dueAt)}</span> : null}
                      </div>
                    </div>
                    <Badge tone={tone}>{getAssignmentStatusLabel(r.operationalStatus)}</Badge>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warn" | "bad" }) {
  return (
    <div style={{
      padding: "8px 10px", borderRadius: 8, background: "var(--pd-soft)",
      display: "flex", flexDirection: "column", gap: 2,
    }}>
      <span className="od-muted" style={{ fontSize: 11 }}>{label}</span>
      <span style={{
        fontSize: 18, fontWeight: 700,
        color: tone === "bad" ? "var(--pd-bad)" : tone === "warn" ? "var(--pd-warn)" : "inherit",
      }}>{value}</span>
    </div>
  );
}
