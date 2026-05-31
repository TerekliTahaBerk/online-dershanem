import { Card } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { AbsenceExcuseStatusBadge } from "./absence-excuse-status-badge";
import {
  getAbsenceExcuseReasonLabel,
  type AbsenceExcuseRow,
} from "@/lib/panel/absence-excuses-display";
import { cancelAbsenceExcuseAction } from "@/app/panel/veli/mazeret/_actions";

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

type Props = {
  excuses: AbsenceExcuseRow[];
  /** Veli görünümü ise iptal butonu göster (PENDING için). */
  allowCancel?: boolean;
};

export function AbsenceExcuseList({ excuses, allowCancel }: Props) {
  if (excuses.length === 0) {
    return (
      <EmptyState
        icon="folder"
        title="Mazeret kaydı yok"
        description="Henüz bildirim oluşturmadınız."
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
                <span style={{ fontWeight: 600 }}>
                  {ex.studentName ?? "Öğrenci"}
                </span>
                <span className="od-muted" style={{ fontSize: 12 }}>
                  · {getAbsenceExcuseReasonLabel(ex.reason)}
                </span>
              </div>
              <div className="od-muted" style={{ fontSize: 13, marginTop: 4 }}>
                {rangeText(ex.startsAt, ex.endsAt)}
                {ex.affectedLessonCount > 0 ? (
                  <> · {ex.affectedLessonCount} ders etkileniyor</>
                ) : null}
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
            <div style={{ flexShrink: 0 }}>
              {allowCancel && ex.status === "PENDING" ? (
                <form action={cancelAbsenceExcuseAction}>
                  <input type="hidden" name="id" value={ex.id} />
                  <button type="submit" className="od-btn od-btn-sm od-btn-ghost">
                    İptal et
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
