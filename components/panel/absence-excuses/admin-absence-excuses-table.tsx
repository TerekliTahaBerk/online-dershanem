import { AbsenceExcuseStatusBadge } from "./absence-excuse-status-badge";
import { AdminExcuseReviewActions } from "./admin-excuse-review-actions";
import {
  getAbsenceExcuseReasonLabel,
  type AbsenceExcuseRow,
} from "@/lib/panel/absence-excuses-display";
import { EmptyState } from "@/components/panel/ui/empty-state";

const DATETIME = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const DATE = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function rangeText(s: Date, e: Date): string {
  if (s.toDateString() === e.toDateString()) return DATE.format(s);
  return `${DATE.format(s)} – ${DATE.format(e)}`;
}

export function AdminAbsenceExcusesTable({
  excuses,
}: {
  excuses: AbsenceExcuseRow[];
}) {
  if (excuses.length === 0) {
    return (
      <EmptyState
        icon="folder"
        title="Mazeret kaydı yok"
        description="Seçili filtrelerde sonuç bulunamadı."
      />
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="od-table" style={{ width: "100%", minWidth: 880 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Durum</th>
            <th style={{ textAlign: "left" }}>Öğrenci</th>
            <th style={{ textAlign: "left" }}>Sebep</th>
            <th style={{ textAlign: "left" }}>Tarih aralığı</th>
            <th style={{ textAlign: "left" }}>Etki</th>
            <th style={{ textAlign: "left" }}>Bildiren</th>
            <th style={{ textAlign: "left" }}>Oluşturuldu</th>
            <th style={{ textAlign: "left" }}>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {excuses.map((ex) => (
            <tr key={ex.id} style={{ verticalAlign: "top" }}>
              <td>
                <AbsenceExcuseStatusBadge status={ex.status} />
              </td>
              <td>
                <div style={{ fontWeight: 600 }}>
                  {ex.studentName ?? "Öğrenci"}
                </div>
                {ex.classroomNames.length > 0 ? (
                  <div className="od-muted" style={{ fontSize: 12 }}>
                    {ex.classroomNames.slice(0, 2).join(", ")}
                  </div>
                ) : null}
              </td>
              <td>
                {getAbsenceExcuseReasonLabel(ex.reason)}
                {ex.note ? (
                  <div className="od-muted" style={{ fontSize: 12, marginTop: 2 }}>
                    {ex.note.length > 80 ? `${ex.note.slice(0, 80)}…` : ex.note}
                  </div>
                ) : null}
              </td>
              <td>{rangeText(ex.startsAt, ex.endsAt)}</td>
              <td>
                {ex.affectedLessonCount > 0
                  ? `${ex.affectedLessonCount} ders`
                  : "—"}
              </td>
              <td>{ex.parentName ?? "—"}</td>
              <td className="od-muted" style={{ fontSize: 12 }}>
                {DATETIME.format(ex.createdAt)}
              </td>
              <td style={{ minWidth: 220 }}>
                {ex.status === "PENDING" ? (
                  <AdminExcuseReviewActions excuseId={ex.id} />
                ) : (
                  <div className="od-muted" style={{ fontSize: 12 }}>
                    {ex.reviewedByName ? `İnceleyen: ${ex.reviewedByName}` : "—"}
                    {ex.reviewedAt ? (
                      <div>{DATETIME.format(ex.reviewedAt)}</div>
                    ) : null}
                    {ex.reviewNote ? (
                      <div style={{ marginTop: 4 }}>
                        <strong>Not:</strong> {ex.reviewNote}
                      </div>
                    ) : null}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
