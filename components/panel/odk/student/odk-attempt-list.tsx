import Link from "next/link";

import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import type { OdkAttemptRow } from "@/lib/panel/odk-student";

const FMT = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} sn`;
  return `${m} dk ${s} sn`;
}

export function OdkAttemptList({
  attempts,
  showCheatHints = false,
}: {
  attempts: OdkAttemptRow[];
  showCheatHints?: boolean;
}) {
  if (attempts.length === 0) {
    return (
      <Card>
        <CardHeader title="Son denemeler" />
        <CardBody>
          <EmptyState
            icon="folder"
            title="Henüz tamamlanan deneme yok"
            description="İlk denemeni tamamladığında burada listelenecek."
            action={
              <Link
                href="/panel/ogrenci/odk/denemeler"
                className="od-btn od-btn-primary od-btn-sm"
              >
                Denemelere git
              </Link>
            }
          />
        </CardBody>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader
        title="Son denemeler"
        subtitle={`${attempts.length} kayıt`}
      />
      <CardBody>
        <table className="od-table">
          <thead>
            <tr>
              <th>Deneme</th>
              <th>Tarih</th>
              <th>D / Y / B</th>
              <th>Süre</th>
              <th>Net</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((a) => (
              <tr key={a.id}>
                <td>
                  <strong>{a.examTitle}</strong>{" "}
                  <span className="od-muted" style={{ fontSize: 11 }}>
                    · {a.cadenceFamily}
                  </span>
                  {a.autoSubmitted ? (
                    <span style={{ marginLeft: 6 }}>
                      <Badge tone="warn">Otomatik</Badge>
                    </span>
                  ) : null}
                  {showCheatHints && a.cheatViolationCount >= 2 ? (
                    <span style={{ marginLeft: 6 }}>
                      <Badge tone="bad">{a.cheatViolationCount} ihlal</Badge>
                    </span>
                  ) : null}
                </td>
                <td style={{ fontSize: 12 }}>
                  {a.submittedAt
                    ? FMT.format(a.submittedAt)
                    : a.status === "IN_PROGRESS"
                      ? "Devam ediyor"
                      : "—"}
                </td>
                <td style={{ fontSize: 12 }}>
                  <span style={{ color: "#16a34a" }}>{a.correctCount}</span>
                  {" / "}
                  <span style={{ color: "#dc2626" }}>{a.wrongCount}</span>
                  {" / "}
                  <span className="od-muted">{a.blankCount}</span>
                </td>
                <td style={{ fontSize: 12 }}>
                  {formatDuration(a.durationSeconds)}
                </td>
                <td>
                  <strong>{a.net != null ? a.net.toFixed(2) : "—"}</strong>
                </td>
                <td>
                  <Link
                    href={`/panel/ogrenci/odk/sonuc/${a.id}`}
                    className="od-btn od-btn-ghost od-btn-sm"
                  >
                    Detay
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}
