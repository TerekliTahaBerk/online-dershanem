import "server-only";
import { prisma } from "@/lib/prisma";
import { calculateCohortGains, COHORT_MIN_STUDENTS } from "@/lib/cohort-quality";
type ErrorCategory = "KNOWLEDGE" | "PROCESS" | "ATTENTION" | "TIME" | "BLANK";
function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export async function loadAdminQuality() {
  const now = new Date();
  const examSince = new Date(now.getTime() - 180 * 86_400_000);
  const qualitySince = new Date(now.getTime() - 30 * 86_400_000);
  const [exams, lessons, assignments, submissions] = await Promise.all([
    prisma.mockExam.findMany({
      where: { takenAt: { gte: examSince } },
      select: {
        studentId: true,
        exam: true,
        takenAt: true,
        sections: {
          select: {
            questionCount: true,
            correctCount: true,
            incorrectCount: true,
            errors: { select: { category: true } },
          },
        },
      },
    }),
    prisma.lesson.findMany({
      where: { status: "COMPLETED", completedAt: { gte: qualitySince } },
      select: { outcomeLinks: { select: { outcomeId: true } } },
    }),
    prisma.assignment.findMany({
      where: { createdAt: { gte: qualitySince }, isActive: true },
      select: { outcomeLinks: { select: { outcomeId: true } } },
    }),
    prisma.assignmentSubmission.findMany({
      where: { submittedAt: { gte: qualitySince }, reviewedAt: { not: null } },
      select: { submittedAt: true, reviewedAt: true },
    }),
  ]);
  const gains = calculateCohortGains(
    exams.map((exam) => ({
      studentKey: exam.studentId,
      exam: exam.exam,
      takenAt: exam.takenAt,
      sections: exam.sections,
    })),
  );
  const ready = gains.filter((item) => item.status === "READY");
  const pairedTotal = gains.reduce((sum, item) => sum + item.pairedStudents, 0);


  const taggedItems = [...lessons, ...assignments].filter(
    (item) => item.outcomeLinks.length > 0,
  ).length;
  const evidenceCoverage =
    lessons.length + assignments.length
      ? Math.round((taggedItems / (lessons.length + assignments.length)) * 100)
      : null;
  const feedbackHours = submissions.flatMap((item) =>
    item.reviewedAt
      ? [(item.reviewedAt.getTime() - item.submittedAt.getTime()) / 3_600_000]
      : [],
  );
  const feedbackMedian = median(feedbackHours);
  const errorStudents = new Map<ErrorCategory, Set<string>>();
  for (const exam of exams)
    for (const section of exam.sections)
      for (const error of section.errors) {
        const students = errorStudents.get(error.category) || new Set<string>();
        students.add(exam.studentId);
        errorStudents.set(error.category, students);
      }
  const commonErrors = [...errorStudents.entries()]
    .filter(([, students]) => students.size >= COHORT_MIN_STUDENTS)
    .sort((a, b) => b[1].size - a[1].size);

 return { gains, ready, pairedTotal, taggedItems, evidenceCoverage, feedbackHours, feedbackMedian, commonErrors, lessons, assignments };
}
