import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import type { OdkPerQuestionRow } from "@/lib/panel/odk-student";

export function OdkQuestionStatusList({
  perQuestion,
}: {
  perQuestion: OdkPerQuestionRow[];
}) {
  if (perQuestion.length === 0) return null;
  return (
    <Card>
      <CardHeader
        title="Soru-soru durum"
        subtitle="Yeşil = doğru · Kırmızı = yanlış · Gri = boş"
      />
      <CardBody>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))",
            gap: 6,
          }}
        >
          {perQuestion.map((q) => {
            const bg = q.isBlank
              ? "#e2e8f0"
              : q.isCorrect
                ? "#bbf7d0"
                : "#fecaca";
            const fg = q.isBlank
              ? "#475569"
              : q.isCorrect
                ? "#166534"
                : "#991b1b";
            return (
              <div
                key={`${q.sectionId}:${q.questionNumber}`}
                style={{
                  background: bg,
                  color: fg,
                  padding: "8px 6px",
                  borderRadius: 6,
                  fontSize: 11,
                  textAlign: "center",
                  lineHeight: 1.3,
                }}
              >
                <div style={{ fontWeight: 700 }}>{q.questionNumber}</div>
                <div>
                  {q.isBlank ? "—" : q.selected} → {q.correct}
                </div>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
