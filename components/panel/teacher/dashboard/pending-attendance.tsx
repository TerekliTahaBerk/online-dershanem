import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import type { TeacherPendingAttendanceRow } from "@/lib/teacher-dashboard";

const DATE_FMT = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
});

type Props = { rows: TeacherPendingAttendanceRow[] };

export function PendingAttendance({ rows }: Props) {
  return (
    <Card>
      <CardHeader
        title="Yoklama bekleyen dersler"
        subtitle={rows.length > 0 ? `${rows.length} ders` : undefined}
      />
      <CardBody>
        {rows.length === 0 ? (
          <EmptyState
            icon="check"
            title="Bekleyen yoklama yok."
            description="Geçmiş derslerin yoklamaları güncel."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rows.map((r) => (
              <div
                key={r.lessonId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "var(--pd-soft)",
                  alignItems: "center",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.title}
                  </div>
                  <div className="od-muted" style={{ fontSize: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 2 }}>
                    <span className="od-mono">{DATE_FMT.format(r.scheduledAt)}</span>
                    {r.classroomName ? <span>· {r.classroomName}</span> : null}
                    <Badge tone="warn">{r.studentCount > 1 ? `${r.studentCount} öğrenci` : "yoklama alınmadı"}</Badge>
                  </div>
                </div>
                {r.classroomId ? (
                  <Link
                    href={`/panel/ogretmen/yoklama/yeni?classroomId=${r.classroomId}&date=${r.scheduledAt.toISOString().slice(0, 10)}`}
                    className="od-btn od-btn-primary od-btn-sm"
                  >
                    Yoklama al
                  </Link>
                ) : (
                  <Link href="/panel/ogretmen/yoklama/yeni" className="od-btn od-btn-ghost od-btn-sm">
                    Yoklama al
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
