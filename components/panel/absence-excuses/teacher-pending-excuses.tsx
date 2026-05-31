import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { AbsenceExcuseStatusBadge } from "./absence-excuse-status-badge";
import { ExcuseReviewActions } from "./excuse-review-actions";
import {
  getAbsenceExcuseReasonLabel,
  type AbsenceExcuseRow,
} from "@/lib/panel/absence-excuses-display";

const DATE = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function rangeText(s: Date, e: Date): string {
  const sk = s.toDateString();
  const ek = e.toDateString();
  if (sk === ek) return DATE.format(s);
  return `${DATE.format(s)} – ${DATE.format(e)}`;
}

/**
 * Reviewer-side excuse list — used by:
 *   - teacher dashboard pending widget
 *   - teacher class detail section
 *   - admin /panel/admin/mazeretler list
 *
 * Shows inline approve/reject controls only when `row.status === "PENDING"`
 * and `allowReview` is true.
 */
export function ReviewerExcuseList({
  excuses,
  allowReview = true,
  variant = "teacher",
  emptyTitle = "Bekleyen mazeret yok",
  emptyDescription = "Şu anda inceleme bekleyen bir mazeret bulunmuyor.",
}: {
  excuses: AbsenceExcuseRow[];
  allowReview?: boolean;
  variant?: "teacher" | "admin";
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (excuses.length === 0) {
    return (
      <EmptyState
        icon="folder"
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {excuses.map((ex) => (
        <Card key={ex.id} padded className="od-excuse-row">
          <div className="od-row od-row-between" style={{ alignItems: "flex-start", gap: 12 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="od-row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <AbsenceExcuseStatusBadge status={ex.status} />
                <span style={{ fontWeight: 600 }}>{ex.studentName ?? "Öğrenci"}</span>
                <span className="od-muted" style={{ fontSize: 12 }}>
                  · {getAbsenceExcuseReasonLabel(ex.reason)}
                </span>
                {ex.classroomNames.length > 0 ? (
                  <span className="od-muted" style={{ fontSize: 12 }}>
                    · {ex.classroomNames.slice(0, 2).join(", ")}
                  </span>
                ) : null}
              </div>
              <div className="od-muted" style={{ fontSize: 13, marginTop: 4 }}>
                {rangeText(ex.startsAt, ex.endsAt)}
                {ex.affectedLessonCount > 0 ? (
                  <> · {ex.affectedLessonCount} ders</>
                ) : null}
                {ex.parentName ? <> · Bildiren: {ex.parentName}</> : null}
              </div>
              {ex.note ? (
                <div className="od-muted" style={{ fontSize: 13, marginTop: 6 }}>
                  {ex.note}
                </div>
              ) : null}
              {ex.reviewNote ? (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    padding: "6px 8px",
                    borderRadius: 6,
                    background: "var(--pd-soft)",
                  }}
                >
                  <strong>İnceleme notu:</strong> {ex.reviewNote}
                </div>
              ) : null}
              {ex.attachmentUrl ? (
                <div style={{ marginTop: 6 }}>
                  <a
                    href={ex.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="od-btn od-btn-sm od-btn-ghost"
                  >
                    Belgeyi aç
                  </a>
                </div>
              ) : null}
            </div>
            <div style={{ flexShrink: 0, minWidth: 200 }}>
              {allowReview && ex.status === "PENDING" ? (
                <ExcuseReviewActions excuseId={ex.id} variant={variant} />
              ) : (
                <div className="od-muted" style={{ fontSize: 12, textAlign: "right" }}>
                  {ex.reviewedByName ? `İnceleyen: ${ex.reviewedByName}` : null}
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * Self-contained card wrapper used on teacher dashboard.
 */
export function TeacherPendingExcuses({ excuses }: { excuses: AbsenceExcuseRow[] }) {
  return (
    <Card>
      <CardHeader
        title="Bekleyen mazeretler"
        subtitle={
          excuses.length > 0
            ? `${excuses.length} bildirim incelemenizi bekliyor`
            : undefined
        }
      />
      <CardBody>
        <ReviewerExcuseList
          excuses={excuses}
          allowReview
          variant="teacher"
          emptyTitle="Bekleyen mazeret yok"
          emptyDescription="Velilerden gelen mazeret bildirimleri burada listelenir."
        />
      </CardBody>
    </Card>
  );
}
