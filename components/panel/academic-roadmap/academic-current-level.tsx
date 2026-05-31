import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import type { AcademicSnapshot } from "@/lib/panel/academic-roadmap";

const DATE = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatHours(seconds: number): string {
  if (seconds <= 0) return "0 dk";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} sa` : `${h} sa ${r} dk`;
}

export function AcademicCurrentLevelCard({
  snapshot,
}: {
  snapshot: AcademicSnapshot;
}) {
  const { latest, latestSubjects, averageNet } = snapshot;

  return (
    <Card>
      <CardHeader title="Mevcut seviyen" subtitle="Gerçek veri — yorumsuz" />
      <CardBody>
        {latest === null && snapshot.totalExams === 0 ? (
          <EmptyState
            icon="chart"
            title="Henüz deneme sonucun yok"
            description="İlk deneme sonucun girildiğinde burada en güncel net ve skorunu göreceksin."
          />
        ) : null}

        {latest ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div className="od-row" style={{ gap: 8, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 600 }}>{latest.title}</div>
              <Badge tone={latest.source === "ODK" ? "purple" : "teal"}>
                {latest.source === "ODK" ? "ODK" : "Deneme"}
              </Badge>
              <span className="od-muted" style={{ fontSize: 12 }}>
                {DATE.format(latest.takenAt)}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0,1fr))",
                gap: 8,
              }}
            >
              <Tile label="Son net" value={latest.net} />
              <Tile label="Son puan" value={latest.score} />
              <Tile
                label="Son 5 ortalama net"
                value={averageNet}
              />
            </div>
          </div>
        ) : null}

        {latestSubjects.length > 0 ? (
          <div style={{ marginTop: 14 }}>
            <div
              className="od-muted"
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                marginBottom: 6,
              }}
            >
              Son denemenin ders kırılımı
            </div>
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "grid",
                gap: 4,
              }}
            >
              {latestSubjects
                .slice()
                .sort((a, b) => (a.net ?? 0) - (b.net ?? 0))
                .map((s) => (
                  <li
                    key={s.subject}
                    className="od-row od-row-between"
                    style={{
                      gap: 8,
                      padding: "6px 8px",
                      borderRadius: 6,
                      background: "var(--pd-soft)",
                      fontSize: 13,
                    }}
                  >
                    <span>{s.subject}</span>
                    <span className="od-mono">{s.net ?? "—"}</span>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0,1fr))",
            gap: 8,
          }}
        >
          <Tile
            label="Son 30g devam"
            value={
              snapshot.presentRate == null
                ? null
                : Math.round(snapshot.presentRate * 100)
            }
            suffix={snapshot.presentRate == null ? "" : "%"}
            empty={
              snapshot.attendanceTotal === 0 ? "Yoklama kaydı yok" : null
            }
          />
          <Tile
            label="Son 7g çalışma"
            valueRaw={formatHours(snapshot.studySecondsLast7)}
          />
          <Tile
            label="Bekleyen ödev"
            value={snapshot.homework.pendingCount}
            tone={snapshot.homework.overdueCount > 0 ? "warn" : "neutral"}
            extra={
              snapshot.homework.overdueCount > 0
                ? `${snapshot.homework.overdueCount} gecikmiş`
                : null
            }
          />
        </div>
      </CardBody>
    </Card>
  );
}

function Tile({
  label,
  value,
  valueRaw,
  suffix,
  tone = "neutral",
  empty,
  extra,
}: {
  label: string;
  value?: number | null;
  valueRaw?: string;
  suffix?: string;
  tone?: "neutral" | "warn" | "ok" | "bad";
  empty?: string | null;
  extra?: string | null;
}) {
  let display: string;
  if (valueRaw != null) {
    display = valueRaw;
  } else if (value == null) {
    display = empty ?? "—";
  } else {
    display = `${value}${suffix ?? ""}`;
  }
  const color =
    tone === "warn"
      ? "var(--pd-warn, #b45309)"
      : tone === "bad"
        ? "var(--pd-danger, #b91c1c)"
        : tone === "ok"
          ? "var(--pd-ok, #065f46)"
          : undefined;
  return (
    <div
      style={{
        padding: "8px 10px",
        borderRadius: 8,
        background: "var(--pd-soft)",
      }}
    >
      <div className="od-muted" style={{ fontSize: 11 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          marginTop: 2,
          color,
        }}
      >
        {display}
      </div>
      {extra ? (
        <div className="od-muted" style={{ fontSize: 11, marginTop: 2 }}>
          {extra}
        </div>
      ) : null}
    </div>
  );
}
