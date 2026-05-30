import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import type { TeacherClassRow } from "@/lib/teacher-dashboard";

type Props = { rows: TeacherClassRow[] };

export function ClassesOverview({ rows }: Props) {
  return (
    <Card>
      <CardHeader
        title="Sınıflarım"
        subtitle={rows.length > 0 ? `${rows.length} sınıf` : undefined}
        right={<Link href="/panel/ogretmen/siniflarim" className="od-btn od-btn-ghost od-btn-sm">Tümü →</Link>}
      />
      <CardBody>
        {rows.length === 0 ? (
          <EmptyState
            icon="classroom"
            title="Henüz sınıf atanmamış."
            description="Yöneticiden sınıf ataması rica edebilirsin."
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
            {rows.map((r) => (
              <Link
                key={r.classroomId}
                href={`/panel/ogretmen/siniflarim/${r.classroomId}`}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid var(--pd-line)",
                  background: "var(--pd-bg)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.name}
                    {r.branch ? <span className="od-muted" style={{ fontWeight: 400 }}> · {r.branch}</span> : null}
                  </div>
                  {r.isLead ? <Badge tone="purple">Lead</Badge> : null}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12 }}>
                  <Stat label="Öğrenci"      value={r.studentCount} />
                  <Stat label="7g ders"      value={r.upcomingLessonCount} />
                  <Stat
                    label="Risk öğrenci"
                    value={r.attendanceRiskCount}
                    tone={r.attendanceRiskCount > 0 ? "bad" : undefined}
                  />
                  <Stat
                    label="Eksik ödev"
                    value={r.missingHomeworkCount}
                    tone={r.missingHomeworkCount > 0 ? "warn" : undefined}
                  />
                </div>
                {r.subject ? <div className="od-muted" style={{ fontSize: 12 }}>{r.subject}</div> : null}
              </Link>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warn" | "bad" }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      padding: "6px 8px",
      borderRadius: 6,
      background: "var(--pd-soft)",
    }}>
      <span className="od-muted">{label}</span>
      <span style={{
        fontWeight: 700,
        color: tone === "bad" ? "var(--pd-bad)" : tone === "warn" ? "var(--pd-warn)" : "inherit",
      }}>{value}</span>
    </div>
  );
}
