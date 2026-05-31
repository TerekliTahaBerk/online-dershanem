import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import type { AcademicGoalRow } from "@/lib/panel/academic-roadmap";

const DATE = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const EXAM_LABEL: Record<string, string> = {
  TYT: "TYT",
  AYT: "AYT",
  YKS: "YKS (TYT + AYT)",
  LGS: "LGS",
  OTHER: "Diğer",
};

function fmtNumber(v: number | null): string {
  if (v == null) return "—";
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(2).replace(/\.0+$/, "");
}

export function AcademicGoalCard({ goal }: { goal: AcademicGoalRow | null }) {
  if (!goal) {
    return (
      <Card>
        <CardHeader title="Hedefin" />
        <CardBody>
          <EmptyState
            icon="target"
            title="Henüz hedef belirlenmemiş"
            description="Aşağıdaki formu kullanarak akademik hedefini yaz: hangi sınava giriyorsun, hangi üniversite/bölümü hedefliyorsun, hangi net/skoru istiyorsun?"
          />
        </CardBody>
      </Card>
    );
  }

  const headline =
    goal.targetUniversity ??
    goal.targetSchool ??
    goal.targetDepartment ??
    "Hedefin tanımlı";

  return (
    <Card>
      <CardHeader
        title="Hedefin"
        subtitle={
          goal.targetDate
            ? `Son tarih: ${DATE.format(goal.targetDate)}`
            : "Tarih belirtilmedi"
        }
      />
      <CardBody>
        <div style={{ display: "grid", gap: 12 }}>
          <div className="od-row" style={{ gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{headline}</div>
            {goal.examType ? (
              <Badge tone="accent">{EXAM_LABEL[goal.examType] ?? goal.examType}</Badge>
            ) : null}
          </div>

          {goal.targetDepartment && goal.targetUniversity ? (
            <div className="od-muted" style={{ fontSize: 13 }}>
              Bölüm: {goal.targetDepartment}
            </div>
          ) : null}

          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0,1fr))",
              gap: 8,
              margin: 0,
              fontSize: 13,
            }}
          >
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                background: "var(--pd-soft)",
              }}
            >
              <dt className="od-muted" style={{ fontSize: 11 }}>Hedef net</dt>
              <dd
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                {fmtNumber(goal.targetNet)}
              </dd>
            </div>
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                background: "var(--pd-soft)",
              }}
            >
              <dt className="od-muted" style={{ fontSize: 11 }}>Hedef skor</dt>
              <dd
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                {fmtNumber(goal.targetScore)}
              </dd>
            </div>
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                background: "var(--pd-soft)",
              }}
            >
              <dt className="od-muted" style={{ fontSize: 11 }}>Hedef sıralama</dt>
              <dd
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                {goal.targetRank != null ? goal.targetRank : "—"}
              </dd>
            </div>
          </dl>

          {goal.note ? (
            <div
              className="od-muted"
              style={{
                fontSize: 13,
                padding: "8px 10px",
                borderRadius: 8,
                background: "var(--pd-soft)",
              }}
            >
              {goal.note}
            </div>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}
