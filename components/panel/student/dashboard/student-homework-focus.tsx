import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import type {
  StudentHomeworkFocus,
  StudentHomeworkRow,
} from "@/lib/panel/student-dashboard";

const DATE_FMT = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" });

function dueLabel(d: Date | null, now = new Date()): string {
  if (!d) return "—";
  const days = Math.floor((d.getTime() - now.getTime()) / 86400000);
  if (days < 0) return `${Math.abs(days)} gün gecikti`;
  if (days === 0) return "Bugün son";
  if (days === 1) return "Yarın son";
  return `${DATE_FMT.format(d)} · ${days} gün kaldı`;
}

function Row({ row }: { row: StudentHomeworkRow }) {
  return (
    <Link
      href="/panel/ogrenci/odevler"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 8,
          padding: "8px 10px",
          borderRadius: 8,
          background: "var(--pd-soft)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {row.title}
          </div>
          <div className="od-muted" style={{ fontSize: 11, marginTop: 2 }}>
            {dueLabel(row.dueAt)}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Badge
            tone={
              row.operationalStatus === "OVERDUE"
                ? "bad"
                : row.operationalStatus === "AWAITING_GRADING"
                ? "warn"
                : row.operationalStatus === "COMPLETED"
                ? "ok"
                : "teal"
            }
          >
            {row.operationalStatus === "OVERDUE"
              ? "Gecikti"
              : row.operationalStatus === "AWAITING_GRADING"
              ? "Kontrolde"
              : row.operationalStatus === "COMPLETED"
              ? "Bitti"
              : "Açık"}
          </Badge>
        </div>
      </div>
    </Link>
  );
}

type Props = { focus: StudentHomeworkFocus };

export function StudentHomeworkFocusCard({ focus }: Props) {
  const total =
    focus.pendingCount + focus.overdueCount + focus.awaitingGradeCount + focus.recentGradedCount;

  return (
    <Card>
      <CardHeader
        title="Ödev odakları"
        subtitle={total === 0 ? undefined : `${focus.pendingCount} açık · ${focus.overdueCount} geciken · ${focus.awaitingGradeCount} kontrolde`}
        right={
          <Link href="/panel/ogrenci/odevler" className="od-btn od-btn-ghost od-btn-sm">
            Tümü →
          </Link>
        }
      />
      <CardBody>
        {total === 0 ? (
          <EmptyState
            icon="assignment"
            title="Şu anda aktif ödev yok"
            description="Yeni ödevlerin yayımlanınca burada görünecek."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {focus.pending.length > 0 ? (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--pd-muted)",
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                    marginBottom: 6,
                  }}
                >
                  Vadesi yaklaşan
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {focus.pending.map((r) => (
                    <Row key={r.assignmentId} row={r} />
                  ))}
                </div>
              </div>
            ) : null}

            {focus.recentGraded.length > 0 ? (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--pd-muted)",
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                    marginBottom: 6,
                  }}
                >
                  Son puanlananlar
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {focus.recentGraded.map((r) => {
                    const max = r.maxScore ?? 100;
                    const ratio = r.score != null ? r.score / max : null;
                    const tone =
                      ratio == null ? "neutral" : ratio >= 0.7 ? "ok" : ratio >= 0.5 ? "warn" : "bad";
                    return (
                      <Link
                        key={r.assignmentId}
                        href="/panel/ogrenci/odevler"
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr auto",
                            gap: 8,
                            padding: "8px 10px",
                            borderRadius: 8,
                            background: "var(--pd-soft)",
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {r.title}
                            </div>
                            <div className="od-muted" style={{ fontSize: 11, marginTop: 2 }}>
                              {r.gradedAt ? `Değerlendirildi: ${DATE_FMT.format(r.gradedAt)}` : "Değerlendirme bekleniyor"}
                            </div>
                          </div>
                          <Badge tone={tone}>
                            {r.score != null ? `${r.score}/${max}` : "—"}
                          </Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
