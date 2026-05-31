import Link from "next/link";

import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import type {
  RoadmapCompactSummary,
  AcademicGap,
} from "@/lib/panel/academic-roadmap";

const EXAM_LABEL: Record<string, string> = {
  TYT: "TYT",
  AYT: "AYT",
  YKS: "YKS",
  LGS: "LGS",
  OTHER: "Diğer",
};

function gapLabel(gap: AcademicGap): { tone: "ok" | "warn" | "bad" | "neutral"; text: string } | null {
  if (!gap.comparable || gap.delta == null) return null;
  if (gap.delta <= 0)
    return { tone: "ok", text: `Hedefi geçtin (+${Math.abs(gap.delta).toFixed(1)})` };
  if (gap.delta <= 5)
    return { tone: "warn", text: `Hedefe ${gap.delta.toFixed(1)} kaldı` };
  return { tone: "bad", text: `Hedefe ${gap.delta.toFixed(1)} kaldı` };
}

export function StudentGoalWidget({
  summary,
}: {
  summary: RoadmapCompactSummary;
}) {
  const goal = summary.goal;
  const gap = gapLabel(summary.gap);

  return (
    <Card>
      <CardHeader
        title="Hedefim"
        subtitle={
          goal
            ? goal.targetUniversity ??
              goal.targetSchool ??
              goal.targetDepartment ??
              "Akademik hedef tanımlı"
            : "Akademik yol haritan"
        }
        right={
          <Link
            href="/panel/ogrenci/hedefim"
            className="od-btn od-btn-ghost od-btn-sm"
          >
            {goal ? "Yol haritasına git →" : "Hedef belirle →"}
          </Link>
        }
      />
      <CardBody>
        {!goal ? (
          <div className="od-muted" style={{ fontSize: 13 }}>
            Henüz aktif bir hedefin yok. Hedef belirlediğinde önerilerin
            kişiselleşir.
          </div>
        ) : (
          <div className="od-row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {goal.examType ? (
              <Badge tone="accent">{EXAM_LABEL[goal.examType] ?? goal.examType}</Badge>
            ) : null}
            {goal.targetNet != null ? (
              <span className="od-muted" style={{ fontSize: 13 }}>
                Hedef net: <strong>{goal.targetNet}</strong>
              </span>
            ) : null}
            {summary.latestNet != null ? (
              <span className="od-muted" style={{ fontSize: 13 }}>
                Son net: <strong>{summary.latestNet}</strong>
              </span>
            ) : null}
            {gap ? <Badge tone={gap.tone}>{gap.text}</Badge> : null}
            {summary.topRecommendation ? (
              <span
                className="od-muted"
                style={{
                  fontSize: 12,
                  marginLeft: "auto",
                  textAlign: "right",
                }}
              >
                Öneri: {summary.topRecommendation.title}
              </span>
            ) : null}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
