import Link from "next/link";

import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import type { OdkTrendPoint } from "@/lib/panel/odk-student";

const DATE = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
});

/**
 * Compact bar-style trend with linked points (right-most = latest).
 */
export function OdkNetTrend({ points }: { points: OdkTrendPoint[] }) {
  const valid = points.filter((p) => p.net != null);
  if (valid.length === 0) {
    return (
      <Card>
        <CardHeader title="ODK net trendi" />
        <CardBody>
          <EmptyState
            icon="chart"
            title="Trend için veri yok"
            description="En az bir tamamlanmış ODK denemesi gerekiyor."
          />
        </CardBody>
      </Card>
    );
  }

  const nets = valid.map((p) => p.net as number);
  const max = Math.max(1, ...nets);
  const min = Math.min(...nets);
  const range = Math.max(1, max - min);

  return (
    <Card>
      <CardHeader
        title="ODK net trendi"
        subtitle={`Son ${valid.length} deneme · min ${min.toFixed(1)} · max ${max.toFixed(1)}`}
      />
      <CardBody>
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "flex-end",
            height: 110,
            padding: "8px 4px",
          }}
        >
          {valid.map((p) => {
            const v = p.net as number;
            const ratio = (v - min) / range;
            const h = 8 + Math.round(ratio * 82);
            return (
              <Link
                key={p.attemptId}
                href={p.href}
                title={`${DATE.format(p.takenAt)} · ${p.examTitle} · net ${v.toFixed(2)}`}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: 90,
                    display: "flex",
                    alignItems: "flex-end",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: h,
                      background: "#2563eb",
                      borderRadius: 4,
                      opacity: 0.85,
                    }}
                  />
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#1e40af" }}>
                  {v.toFixed(1)}
                </div>
                <div className="od-muted" style={{ fontSize: 10 }}>
                  {DATE.format(p.takenAt)}
                </div>
              </Link>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
