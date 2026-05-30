import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import {
  formatStudyDuration,
  type StudentStudySummary,
} from "@/lib/panel/student-dashboard";

const DAY_LABEL_FMT = new Intl.DateTimeFormat("tr-TR", { weekday: "short" });

type Props = { summary: StudentStudySummary };

function dayLabel(yyyymmdd: string): string {
  // Parse local YYYY-MM-DD → Date in local time.
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return DAY_LABEL_FMT.format(date);
}

export function StudentStudySummaryCard({ summary }: Props) {
  const max = Math.max(1, ...summary.last7Days.map((b) => b.totalSeconds));

  return (
    <Card>
      <CardHeader
        title="Çalışma odası"
        subtitle={
          summary.totalSecondsLast7 > 0
            ? `Son 7 gün: ${formatStudyDuration(summary.totalSecondsLast7)}`
            : "Henüz kayıtlı çalışma yok"
        }
        right={
          <div style={{ display: "flex", gap: 6 }}>
            {summary.active ? (
              <Badge tone="accent">Aktif oturum</Badge>
            ) : null}
            <Link href="/panel/ogrenci/calisma-odasi" className="od-btn od-btn-primary od-btn-sm">
              {summary.active ? "Odaya dön →" : "Çalışma başlat"}
            </Link>
          </div>
        }
      />
      <CardBody>
        {summary.totalSecondsLast7 === 0 && summary.recent.length === 0 && !summary.active ? (
          <EmptyState
            icon="clock"
            title="Bireysel çalışmanı kayda al"
            description="Çalışma odasında zamanlayıcıyı başlat, hangi derse ne kadar zaman ayırdığını gör."
          />
        ) : (
          <>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-end",
                padding: "8px 4px",
                marginBottom: 10,
              }}
            >
              {summary.last7Days.map((b) => {
                const ratio = b.totalSeconds / max;
                const h = Math.max(4, Math.round(ratio * 60));
                return (
                  <div
                    key={b.day}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                    }}
                    title={`${dayLabel(b.day)} · ${formatStudyDuration(b.totalSeconds)}`}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: 60,
                        display: "flex",
                        alignItems: "flex-end",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: h,
                          borderRadius: 4,
                          background: b.totalSeconds > 0
                            ? "var(--pd-accent, #2563eb)"
                            : "var(--pd-muted-soft, rgba(148,163,184,0.25))",
                          opacity: b.totalSeconds > 0 ? 0.85 : 0.4,
                        }}
                      />
                    </div>
                    <span className="od-muted" style={{ fontSize: 10 }}>
                      {dayLabel(b.day)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "var(--pd-soft)",
                }}
              >
                <div className="od-muted" style={{ fontSize: 11 }}>Bugün</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>
                  {formatStudyDuration(summary.todaySeconds)}
                </div>
              </div>
              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "var(--pd-soft)",
                }}
              >
                <div className="od-muted" style={{ fontSize: 11 }}>Son 7 gün</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>
                  {formatStudyDuration(summary.totalSecondsLast7)}
                </div>
              </div>
            </div>

            {summary.recent.length > 0 ? (
              <>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--pd-muted)",
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                    marginBottom: 4,
                  }}
                >
                  Son oturumlar
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {summary.recent.slice(0, 3).map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        gap: 8,
                        padding: "6px 10px",
                        borderRadius: 6,
                        background: "var(--pd-soft)",
                        fontSize: 12,
                      }}
                    >
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.courseTitle ?? r.subject ?? "Serbest çalışma"}
                      </span>
                      <span className="od-mono od-muted">
                        {formatStudyDuration(r.durationSeconds ?? 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </>
        )}
      </CardBody>
    </Card>
  );
}
