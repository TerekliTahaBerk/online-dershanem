import Link from "next/link";

import { Card, CardBody } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import type { OdkStudentSummary } from "@/lib/panel/odk-student";

/**
 * Compact, dashboard-friendly CTA strip:
 *  - Resumes an in-progress attempt (priority 1)
 *  - Surfaces a "Yeni deneme var" hint when an unattempted exam is available
 *  - Otherwise stays silent — no card is rendered.
 */
export function StudentOdkCtaStrip({
  summary,
}: {
  summary: OdkStudentSummary;
}) {
  if (summary.inProgressAttempt) {
    return (
      <Card>
        <CardBody>
          <div
            className="od-row od-row-between"
            style={{ gap: 12, alignItems: "center", flexWrap: "wrap" }}
          >
            <div>
              <Badge tone="warn">Devam ediyor</Badge>{" "}
              <strong style={{ marginLeft: 6 }}>
                {summary.inProgressAttempt.examTitle}
              </strong>
              <div className="od-muted" style={{ fontSize: 12, marginTop: 4 }}>
                Yarım kalan denemen var. Süre işlemeye devam ediyor olabilir.
              </div>
            </div>
            <Link
              href={`/panel/ogrenci/odk/cozum/${summary.inProgressAttempt.id}`}
              className="od-btn od-btn-primary od-btn-sm"
            >
              Devam et
            </Link>
          </div>
        </CardBody>
      </Card>
    );
  }
  if (summary.hasNewAvailable) {
    return (
      <Card>
        <CardBody>
          <div
            className="od-row od-row-between"
            style={{ gap: 12, alignItems: "center", flexWrap: "wrap" }}
          >
            <div>
              <Badge tone="accent">Yeni deneme var</Badge>
              <div className="od-muted" style={{ fontSize: 12, marginTop: 4 }}>
                {summary.availableCount} erişilebilir denemen var. Hazır
                olduğunda başlayabilirsin.
              </div>
            </div>
            <Link
              href="/panel/ogrenci/odk/denemeler"
              className="od-btn od-btn-primary od-btn-sm"
            >
              Denemelere git
            </Link>
          </div>
        </CardBody>
      </Card>
    );
  }
  return null;
}
