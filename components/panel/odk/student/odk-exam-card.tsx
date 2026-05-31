import Link from "next/link";

import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import type { OdkAvailableExam } from "@/lib/panel/odk-student";

const STATUS: Record<
  OdkAvailableExam["status"],
  { tone: "ok" | "warn" | "bad" | "neutral" | "accent"; label: string }
> = {
  AVAILABLE: { tone: "accent", label: "Başlanabilir" },
  IN_PROGRESS: { tone: "warn", label: "Devam ediyor" },
  COMPLETED: { tone: "ok", label: "Tamamlandı" },
  EXPIRED: { tone: "bad", label: "Süresi doldu" },
  NOT_YET: { tone: "neutral", label: "Henüz açılmadı" },
};

export function OdkExamCard({ exam }: { exam: OdkAvailableExam }) {
  const { tone, label } = STATUS[exam.status];
  return (
    <Card>
      <CardHeader
        title={exam.title}
        right={<Badge tone={tone}>{label}</Badge>}
        subtitle={`${exam.cadenceFamily}${
          exam.classLevel ? ` · ${exam.classLevel}. sınıf` : ""
        } · ${exam.durationMinutes} dk · ${exam.totalQuestions} soru`}
      />
      <CardBody>
        <div
          className="od-row od-row-between"
          style={{ gap: 12, alignItems: "center" }}
        >
          <span className="od-muted" style={{ fontSize: 13 }}>
            {exam.status === "COMPLETED" && exam.lastAttemptScore != null
              ? `Son net: ${exam.lastAttemptScore.toFixed(2)}`
              : exam.status === "IN_PROGRESS"
                ? "Devam eden bir çözümün var."
                : exam.status === "EXPIRED"
                  ? "Bu denemenin süresi doldu."
                  : exam.status === "NOT_YET" && exam.startsAt
                    ? `Açılış: ${exam.startsAt.toLocaleDateString("tr-TR", {
                        day: "2-digit",
                        month: "short",
                      })}`
                    : "Henüz başlamadın."}
          </span>
          <Cta exam={exam} />
        </div>
      </CardBody>
    </Card>
  );
}

function Cta({ exam }: { exam: OdkAvailableExam }) {
  if (exam.status === "IN_PROGRESS" && exam.lastAttemptId) {
    return (
      <Link
        href={`/panel/ogrenci/odk/cozum/${exam.lastAttemptId}`}
        className="od-btn od-btn-primary od-btn-sm"
      >
        Devam et
      </Link>
    );
  }
  if (exam.status === "COMPLETED" && exam.lastAttemptId) {
    return (
      <Link
        href={`/panel/ogrenci/odk/sonuc/${exam.lastAttemptId}`}
        className="od-btn od-btn-ghost od-btn-sm"
      >
        Sonucu gör
      </Link>
    );
  }
  if (exam.status === "AVAILABLE") {
    return (
      <Link
        href={`/panel/ogrenci/odk/baslat/${exam.id}`}
        className="od-btn od-btn-primary od-btn-sm"
      >
        Başla
      </Link>
    );
  }
  return null;
}
