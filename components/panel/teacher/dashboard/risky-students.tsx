import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import type { TeacherRiskyStudentRow, RiskReason } from "@/lib/teacher-dashboard";

const REASON_META: Record<RiskReason, { label: string; tone: "warn" | "bad" }> = {
  ABSENCE:             { label: "Devamsızlık",  tone: "bad"  },
  LATE_OR_LEFT_EARLY:  { label: "Geç / Erken",  tone: "warn" },
  MISSING_HOMEWORK:    { label: "Eksik ödev",   tone: "warn" },
};

const DATE_FMT = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" });

type Props = { rows: TeacherRiskyStudentRow[] };

export function RiskyStudents({ rows }: Props) {
  return (
    <Card>
      <CardHeader
        title="Riskli öğrenciler"
        subtitle="Son 30 gün — devamsızlık / geç / eksik ödev"
      />
      <CardBody>
        {rows.length === 0 ? (
          <EmptyState
            icon="user"
            title="Şu an riskli öğrencin yok."
            description="Son 30 günde tekrarlayan devamsızlık, gecikme ya da eksik ödev tespit edilmedi."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rows.map((r) => (
              <Link
                key={r.studentId}
                href={`/panel/ogretmen/ogrencilerim?student=${r.studentId}`}
                className="od-row-link"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "var(--pd-soft)",
                  alignItems: "center",
                  color: "inherit",
                  textDecoration: "none",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.fullName}
                    {r.classroomName ? (
                      <span className="od-muted" style={{ fontWeight: 400 }}> · {r.classroomName}</span>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                    {r.reasons.map((reason) => (
                      <Badge key={reason} tone={REASON_META[reason].tone}>
                        {REASON_META[reason].label}
                        {reason === "ABSENCE"            ? ` ${r.absenceCount}`            :
                         reason === "LATE_OR_LEFT_EARLY" ? ` ${r.lateCount}`               :
                                                          ` ${r.missingHomeworkCount}`}
                      </Badge>
                    ))}
                    {r.lastActivityAt ? (
                      <span className="od-muted" style={{ fontSize: 11, alignSelf: "center" }}>
                        son işaret {DATE_FMT.format(r.lastActivityAt)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <span className="od-btn od-btn-ghost od-btn-sm">Profil →</span>
              </Link>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
