import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import {
  getAssignmentStatusLabel,
  getAssignmentStatusTone,
} from "@/lib/homework";
import type { TeacherHomeworkReviewRow } from "@/lib/teacher-dashboard";

const DATE_FMT = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" });

const TONE_MAP: Record<string, "ok" | "warn" | "bad" | "neutral" | "teal"> = {
  ok: "ok", warn: "warn", bad: "bad", neutral: "neutral", teal: "teal",
};

type Props = { rows: TeacherHomeworkReviewRow[] };

export function HomeworkReviewQueue({ rows }: Props) {
  return (
    <Card>
      <CardHeader
        title="Kontrol bekleyen ödevler"
        subtitle={rows.length > 0 ? `${rows.length} ödev` : undefined}
        right={<Link href="/panel/ogretmen/odevler" className="od-btn od-btn-ghost od-btn-sm">Tümü →</Link>}
      />
      <CardBody>
        {rows.length === 0 ? (
          <EmptyState
            icon="assignment"
            title="Kontrol bekleyen teslim yok."
            description="Tüm teslimler değerlendirilmiş — gözüne kestirdiğin yeni bir ödev oluşturabilirsin."
            action={
              <Link href="/panel/ogretmen/odevler/yeni" className="od-btn od-btn-primary od-btn-sm">+ Ödev oluştur</Link>
            }
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rows.map((r) => {
              const tone = TONE_MAP[getAssignmentStatusTone(r.operationalStatus)] ?? "neutral";
              return (
                <Link
                  key={r.assignmentId}
                  href={`/panel/ogretmen/odevler/${r.assignmentId}`}
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
                      {r.title}
                    </div>
                    <div className="od-muted" style={{ fontSize: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 2 }}>
                      {r.classroomName ? <span>{r.classroomName}</span> : <span>Direkt atama</span>}
                      <span>· {r.submittedCount}/{r.expected} teslim</span>
                      {r.ungradedCount > 0 ? <Badge tone="warn">{r.ungradedCount} kontrol bekliyor</Badge> : null}
                      {r.dueAt ? <span>· son {DATE_FMT.format(r.dueAt)}</span> : null}
                      <Badge tone={tone}>{getAssignmentStatusLabel(r.operationalStatus)}</Badge>
                    </div>
                  </div>
                  <span className="od-btn od-btn-primary od-btn-sm">Kontrol et</span>
                </Link>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
