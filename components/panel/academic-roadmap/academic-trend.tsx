import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import Link from "next/link";
import type { AcademicTrendPoint } from "@/lib/panel/academic-roadmap";

const DATE = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
});

/**
 * Light-weight trend visual — a sparkline-style bar list, no chart library.
 * Points are chronological (oldest → newest); the rightmost bar is the
 * latest exam.
 */
export function AcademicTrend({
  points,
}: {
  points: AcademicTrendPoint[];
}) {
  const valid = points.filter((p) => p.net !== null);

  if (valid.length === 0) {
    return (
      <Card>
        <CardHeader title="Net trendi" />
        <CardBody>
          <EmptyState
            icon="chart"
            title="Trend için veri yok"
            description="Trend oluşturmak için en az bir deneme sonucu gerekiyor."
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
        title="Net trendi"
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
            marginBottom: 8,
          }}
        >
          {valid.map((p) => {
            const v = p.net as number;
            // Scale from min..max to 8..90px
            const ratio = (v - min) / range;
            const h = 8 + Math.round(ratio * 82);
            const inner = (
              <>
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
                      borderRadius: 4,
                      background:
                        p.source === "ODK"
                          ? "var(--pd-purple, #7c3aed)"
                          : "var(--pd-accent, #2563eb)",
                      opacity: 0.9,
                    }}
                  />
                </div>
                <span
                  className="od-muted od-mono"
                  style={{ fontSize: 10 }}
                >
                  {DATE.format(p.takenAt)}
                </span>
              </>
            );
            const wrapStyle = {
              flex: 1,
              display: "flex",
              flexDirection: "column" as const,
              alignItems: "center",
              gap: 4,
              textDecoration: "none",
              color: "inherit",
            };
            return p.href ? (
              <Link
                key={p.id}
                href={p.href}
                title={`${DATE.format(p.takenAt)} · ${p.title} · net ${v}`}
                style={wrapStyle}
              >
                {inner}
              </Link>
            ) : (
              <div
                key={p.id}
                title={`${DATE.format(p.takenAt)} · ${p.title} · net ${v}`}
                style={wrapStyle}
              >
                {inner}
              </div>
            );
          })}
        </div>
        <div
          className="od-muted"
          style={{ fontSize: 11, textAlign: "right" }}
        >
          Mavi: deneme · Mor: ODK
        </div>
      </CardBody>
    </Card>
  );
}
