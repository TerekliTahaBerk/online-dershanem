import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import {
  ATTENDANCE_DISPLAY_ORDER,
  getAttendanceStatusLabel,
  getAttendanceStatusGlyph,
  getAttendanceStatusTone,
} from "@/lib/attendance";
import type { ClassAttendanceSummary } from "@/lib/teacher-dashboard";

const TONE_MAP: Record<string, "ok" | "warn" | "bad" | "neutral"> = {
  good: "ok", warn: "warn", bad: "bad", muted: "neutral", neutral: "neutral",
};

type Props = { classroomId: string; summary: ClassAttendanceSummary };

export function ClassAttendanceSummaryCard({ classroomId, summary }: Props) {
  const dateStr = new Date().toISOString().slice(0, 10);
  return (
    <Card>
      <CardHeader
        title="Yoklama özeti"
        subtitle={`Son 30 gün · ${summary.totalRecords} kayıt · ${summary.lessonsWithAttendance} ders`}
        right={
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Link
              href={`/panel/ogretmen/yoklama/yeni?classroomId=${classroomId}&date=${dateStr}`}
              className="od-btn od-btn-primary od-btn-sm"
            >
              + Yoklama al
            </Link>
            <Link
              href={`/panel/admin/devamsizlik?classroomId=${classroomId}`}
              className="od-btn od-btn-ghost od-btn-sm"
            >
              Tüm devamsızlık →
            </Link>
          </div>
        }
      />
      <CardBody>
        {summary.totalRecords === 0 ? (
          <EmptyState
            icon="check"
            title="Son 30 günde yoklama kaydı yok."
            description="Bu sınıfa ait yoklama girildiğinde özet burada görünecek."
          />
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginBottom: 12 }}>
              {ATTENDANCE_DISPLAY_ORDER.map((s) => {
                const count = summary.byStatus[s];
                const tone = TONE_MAP[getAttendanceStatusTone(s)] ?? "neutral";
                return (
                  <div key={s} style={{
                    padding: "8px 10px", borderRadius: 8,
                    background: "var(--pd-soft)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 6,
                  }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}>
                      <span style={{ fontSize: 14 }}>{getAttendanceStatusGlyph(s)}</span>
                      <span className="od-muted">{getAttendanceStatusLabel(s)}</span>
                    </div>
                    <Badge tone={tone}>{count}</Badge>
                  </div>
                );
              })}
            </div>
            {summary.topAbsences.length > 0 ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--pd-muted)", textTransform: "uppercase", letterSpacing: 0.6, margin: "6px 0" }}>
                  En çok devamsız
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {summary.topAbsences.map((a) => (
                    <Link
                      key={a.studentId}
                      href={`/panel/ogretmen/ogrencilerim?student=${a.studentId}`}
                      style={{
                        display: "flex", justifyContent: "space-between",
                        padding: "6px 10px", borderRadius: 6, background: "var(--pd-soft)",
                        color: "inherit", textDecoration: "none", fontSize: 13,
                      }}
                    >
                      <span>{a.fullName}</span>
                      <Badge tone="bad">{a.absenceCount} devamsız</Badge>
                    </Link>
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
