import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import {
  getReadinessLabel,
  getReadinessTone,
  type OdkExamReadiness,
} from "@/lib/panel/odk-admin-display";

/**
 * Phase 2 / Session 15 — readiness checklist (server component).
 *
 * Renders the rules emitted by `computeOdkExamReadiness` with a colour-coded
 * dot per rule. Replaces the ad-hoc inline checklist that used to live in the
 * detail page so list, detail and any future surface (cron warning email,
 * dashboard tile) all read from the same source of truth.
 *
 * Rules with `level === "error"` block publish; rules with `level === "warn"`
 * are advisory only.
 */
export function OdkExamReadinessChecklist({
  readiness,
  title = "Yayın hazırlığı",
  subtitle,
}: {
  readiness: OdkExamReadiness;
  title?: string;
  subtitle?: string;
}) {
  const errorCount = readiness.rules.filter((r) => r.level === "error").length;
  const warnCount = readiness.rules.filter((r) => r.level === "warn").length;

  const summary =
    subtitle ??
    (readiness.publishAllowed
      ? warnCount > 0
        ? `Yayınlanabilir · ${warnCount} uyarı var`
        : "Tüm kriterler tamam, yayınlanabilir."
      : `${errorCount} eksik madde var. Yayınlamadan önce tamamlayın.`);

  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={summary}
        right={<Badge tone={getReadinessTone(readiness.overall)}>{getReadinessLabel(readiness.overall)}</Badge>}
      />
      <CardBody>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {readiness.rules.map((r) => {
            const dotBg =
              r.level === "ok"
                ? "#16a34a"
                : r.level === "warn"
                  ? "#f59e0b"
                  : "#dc2626";
            const dotMark = r.level === "ok" ? "✓" : r.level === "warn" ? "!" : "✕";
            return (
              <li
                key={r.id}
                style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13 }}
              >
                <span
                  aria-hidden
                  style={{
                    flex: "0 0 auto",
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: dotBg,
                    color: "white",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    marginTop: 1,
                  }}
                >
                  {dotMark}
                </span>
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span
                    style={{
                      color:
                        r.level === "ok" ? "var(--pd-ink-1)" : "var(--pd-ink-2)",
                      fontWeight: 500,
                    }}
                  >
                    {r.label}
                  </span>
                  {r.detail ? (
                    <span className="od-muted" style={{ fontSize: 12 }}>
                      {r.detail}
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}
