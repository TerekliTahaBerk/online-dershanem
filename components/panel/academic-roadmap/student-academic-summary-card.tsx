import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import {
  getStudentRoadmapCompactSummary,
  type RoadmapCompactSummary,
} from "@/lib/panel/academic-roadmap";

const EXAM_LABEL: Record<string, string> = {
  TYT: "TYT",
  AYT: "AYT",
  YKS: "YKS",
  LGS: "LGS",
  OTHER: "Diğer",
};

const TONE_LABEL: Record<string, string> = {
  bad: "Öncelik",
  warn: "Dikkat",
  ok: "İyi gidiyor",
  neutral: "Sıradaki",
};

function formatHours(seconds: number): string {
  if (seconds <= 0) return "0 dk";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} sa` : `${h} sa ${r} dk`;
}

/**
 * Read-only academic-goal summary used inside Student 360 (admin/teacher
 * profile detail). Permission: gated by the parent route — this component
 * does not enforce auth itself, so do not import from non-360 surfaces.
 */
export async function StudentAcademicSummaryCard({
  studentId,
  studentUserId,
}: {
  studentId: string;
  studentUserId: string | null;
}) {
  const summary: RoadmapCompactSummary = await getStudentRoadmapCompactSummary(
    studentId,
    studentUserId,
  );

  const goal = summary.goal;
  const top = summary.topRecommendation;

  return (
    <Card>
      <CardHeader
        title="Akademik yol haritası"
        subtitle={
          goal
            ? "Öğrencinin aktif hedefi · özet"
            : "Öğrencinin tanımlı hedefi yok"
        }
        right={
          goal ? <Badge tone="accent">Aktif</Badge> : null
        }
      />
      <CardBody>
        {!goal ? (
          <EmptyState
            icon="target"
            title="Henüz hedef belirlenmemiş"
            description="Bu öğrenci akademik yol haritasında henüz aktif bir hedef tanımlamamış."
          />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <div className="od-row" style={{ gap: 8, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 600 }}>
                {goal.targetUniversity ??
                  goal.targetSchool ??
                  goal.targetDepartment ??
                  "Hedef tanımlı"}
              </div>
              {goal.examType ? (
                <Badge tone="accent">
                  {EXAM_LABEL[goal.examType] ?? goal.examType}
                </Badge>
              ) : null}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0,1fr))",
                gap: 8,
              }}
            >
              <Cell label="Hedef net" value={goal.targetNet} />
              <Cell label="Hedef puan" value={goal.targetScore} />
              <Cell
                label="Son net"
                value={summary.latestNet}
                empty={summary.latestNet == null ? "Veri yok" : null}
              />
              <Cell
                label="Son 7g çalışma"
                valueRaw={formatHours(summary.studySecondsLast7)}
              />
            </div>

            {top ? (
              <div
                className="od-row od-row-between"
                style={{
                  gap: 12,
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "var(--pd-soft)",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    className="od-row"
                    style={{
                      gap: 8,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <Badge tone={top.tone}>{TONE_LABEL[top.tone]}</Badge>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                      {top.title}
                    </span>
                  </div>
                  <div
                    className="od-muted"
                    style={{ fontSize: 12, marginTop: 4 }}
                  >
                    {top.reason}
                  </div>
                </div>
              </div>
            ) : null}

            {summary.gap.comparable && summary.gap.delta != null ? (
              <div className="od-muted" style={{ fontSize: 12 }}>
                Hedefe kalan ({summary.gap.axis}):{" "}
                <strong>
                  {summary.gap.delta <= 0
                    ? `Geçti (+${Math.abs(summary.gap.delta).toFixed(1)})`
                    : summary.gap.delta.toFixed(1)}
                </strong>
              </div>
            ) : summary.gap.reason ? (
              <div className="od-muted" style={{ fontSize: 12 }}>
                {summary.gap.reason}
              </div>
            ) : null}

            {goal.note ? (
              <div className="od-muted" style={{ fontSize: 12 }}>
                Not: {goal.note}
              </div>
            ) : null}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Cell({
  label,
  value,
  valueRaw,
  empty,
}: {
  label: string;
  value?: number | null;
  valueRaw?: string;
  empty?: string | null;
}) {
  let display: string;
  if (valueRaw != null) display = valueRaw;
  else if (value == null) display = empty ?? "—";
  else
    display = Number.isInteger(value)
      ? String(value)
      : value.toFixed(2).replace(/\.0+$/, "");
  return (
    <div
      style={{
        padding: "6px 8px",
        borderRadius: 6,
        background: "var(--pd-soft)",
      }}
    >
      <div className="od-muted" style={{ fontSize: 11 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
        {display}
      </div>
    </div>
  );
}
