import type { OdkExamStatus, ProductCode } from "@prisma/client";

export type Student360LessonSignal = {
  id: string;
  startsAt: Date;
  title: string;
};

export type Student360ExamSignal = {
  id: string;
  title: string;
  status: OdkExamStatus;
  startsAt: Date | null;
  endsAt: Date | null;
};

export type Student360IssueCode =
  | "PROVISIONING_BLOCKED"
  | "GROUP_MISSING"
  | "PARENT_MISSING"
  | "COACH_MISSING";

export type Student360Issue = {
  code: Student360IssueCode;
  title: string;
  description: string;
  severity: "warning" | "critical";
};

export function pickNearestUpcomingLesson(
  lessons: Student360LessonSignal[],
  now: Date,
): Student360LessonSignal | null {
  return (
    lessons
      .filter((lesson) => lesson.startsAt.getTime() >= now.getTime())
      .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime())[0] ?? null
  );
}

export function pickNearestUpcomingExam(
  exams: Student360ExamSignal[],
  now: Date,
): Student360ExamSignal | null {
  const live =
    exams
      .filter((exam) => exam.status === "LIVE" && (!exam.endsAt || exam.endsAt.getTime() > now.getTime()))
      .sort(
        (left, right) =>
          (left.startsAt?.getTime() ?? Number.MIN_SAFE_INTEGER) -
          (right.startsAt?.getTime() ?? Number.MIN_SAFE_INTEGER),
      )[0] ?? null;
  if (live) return live;
  return (
    exams
      .filter(
        (exam) =>
          exam.status === "SCHEDULED" &&
          Boolean(exam.startsAt) &&
          (exam.startsAt?.getTime() ?? 0) >= now.getTime() &&
          (!exam.endsAt || exam.endsAt.getTime() > now.getTime()),
      )
      .sort((left, right) => (left.startsAt?.getTime() ?? 0) - (right.startsAt?.getTime() ?? 0))[0] ?? null
  );
}

export function deriveStudent360Issues(input: {
  products: readonly ProductCode[];
  blockedProvisioningCount: number;
  hasActiveGroup: boolean;
  hasParentLink: boolean;
  hasCoachAssignment: boolean;
}): Student360Issue[] {
  const issues: Student360Issue[] = [];
  if (input.blockedProvisioningCount > 0) {
    issues.push({
      code: "PROVISIONING_BLOCKED",
      title: "Ödeme alındı, ürün erişimi açılmadı",
      description: `${input.blockedProvisioningCount} siparişte provisioning tamamlanmamış görünüyor.`,
      severity: "critical",
    });
  }
  if (input.products.includes("OD") && !input.hasActiveGroup) {
    issues.push({
      code: "GROUP_MISSING",
      title: "Grup ataması eksik",
      description: "Online Dershanem erişimi var ama aktif grup kaydı yok.",
      severity: "warning",
    });
  }
  if (input.products.includes("OD") && !input.hasParentLink) {
    issues.push({
      code: "PARENT_MISSING",
      title: "Veli bağlantısı eksik",
      description: "Öğrencinin aktif veli bağlantısı bulunmuyor.",
      severity: "warning",
    });
  }
  if (input.products.includes("OK") && !input.hasCoachAssignment) {
    issues.push({
      code: "COACH_MISSING",
      title: "Koç ataması eksik",
      description: "Online Koçum erişimi var ama aktif koç ataması yok.",
      severity: "warning",
    });
  }
  return issues;
}
