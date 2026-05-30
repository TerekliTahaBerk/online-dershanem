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
import type { StudentAttendanceSnapshot } from "@/lib/panel/student-dashboard";

const TONE_MAP: Record<string, "ok" | "warn" | "bad" | "neutral"> = {
  good: "ok", warn: "warn", bad: "bad", muted: "neutral", neutral: "neutral",
};

const DATE_FMT = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" });

type Props = { snapshot: StudentAttendanceSnapshot };

export function StudentAttendanceSnapshotCard({ snapshot }: Props) {
  const ratePct =
    snapshot.presentRate != null ? Math.round(snapshot.presentRate * 100) : null;
  const rateTone =
    ratePct == null ? "neutral" : ratePct >= 90 ? "ok" : ratePct >= 75 ? "warn" : "bad";

  return (
    <Card>
      <CardHeader
        title="Devam (son 30 gün)"
        subtitle={`${snapshot.totalRecords} kayıt`}
        right={
          ratePct != null ? (
            <Badge tone={rateTone}>%{ratePct} katılım</Badge>
          ) : (
            <Link href="/panel/ogrenci/ders-programi" className="od-btn od-btn-ghost od-btn-sm">
              Programa git →
            </Link>
          )
        }
      />
      <CardBody>
        {snapshot.totalRecords === 0 ? (
          <EmptyState
            icon="check"
            title="Son 30 günde yoklama kaydı yok"
            description="Derslerine başladıkça burada görünecek."
          />
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                gap: 8,
                marginBottom: 10,
              }}
            >
              {ATTENDANCE_DISPLAY_ORDER.map((s) => {
                const count = snapshot.byStatus[s] ?? 0;
                const tone = TONE_MAP[getAttendanceStatusTone(s)] ?? "neutral";
                return (
                  <div
                    key={s}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: "var(--pd-soft)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}>
                      <span style={{ fontSize: 14 }}>{getAttendanceStatusGlyph(s)}</span>
                      <span className="od-muted">{getAttendanceStatusLabel(s)}</span>
                    </div>
                    <Badge tone={tone}>{count}</Badge>
                  </div>
                );
              })}
            </div>

            {snapshot.recent.length > 0 ? (
              <>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--pd-muted)",
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                    margin: "6px 0",
                  }}
                >
                  Son kayıtlar
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {snapshot.recent.map((r) => {
                    const tone = TONE_MAP[getAttendanceStatusTone(r.status)] ?? "neutral";
                    return (
                      <div
                        key={r.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "70px 1fr auto",
                          gap: 8,
                          padding: "6px 10px",
                          borderRadius: 6,
                          background: "var(--pd-soft)",
                          fontSize: 13,
                          alignItems: "center",
                        }}
                      >
                        <span className="od-mono od-muted" style={{ fontSize: 12 }}>
                          {DATE_FMT.format(r.sessionDate)}
                        </span>
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.lessonTitle ?? "Ders"}
                        </span>
                        <Badge tone={tone}>{getAttendanceStatusLabel(r.status)}</Badge>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
          </>
        )}
      </CardBody>
    </Card>
  );
}
