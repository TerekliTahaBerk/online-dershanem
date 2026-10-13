import "server-only";
import { prisma } from "@/lib/prisma";
import { PUBLICATION_STAGES, publicationStageOf, type PublicationStage } from "./staff-workspace";
import { SUBMITTED_STATUSES } from "./staff-management-data";
export const QUEUE_TABS: Array<{ id: "kuyruk" | PublicationStage | "tumu"; label: string }> = [
  { id: "kuyruk", label: "İş kuyruğu" },
  { id: "PUANLANIYOR", label: "Puanlama bekliyor" },
  { id: "INCELEME", label: "Yayın bekliyor" },
  { id: "YAYINLANDI", label: "Yayınlandı" },
  { id: "tumu", label: "Tümü" },
];
export async function loadOdkResultsQueue(requestedStage?: string) {
  const requested = requestedStage;
  const tab = QUEUE_TABS.find((item) => item.id === requested)?.id ?? "kuyruk";
  const now = new Date();
  const exams = await prisma.odkExam.findMany({
    where: {
      OR: [{ status: { in: ["ENDED", "SCORED", "RELEASED"] } }, { status: { in: ["SCHEDULED", "LIVE"] }, endsAt: { lte: now } }],
    },
    orderBy: [{ endsAt: "desc" }, { updatedAt: "desc" }],
    take: 100,
    select: {
      id: true,
      title: true,
      family: true,
      examFamilyRef: { select: { code: true } },
      status: true,
      startsAt: true,
      endsAt: true,
      resultsReleasedAt: true,
      _count: { select: { assignments: { where: { isActive: true } } } },
      attempts: {
        where: { status: { in: [...SUBMITTED_STATUSES] } },
        select: { integrityLevel: true, integrityReviewedAt: true, score: { select: { publicationStatus: true } } },
      },
    },
  });
  const rows = exams.map((exam) => {
    const unscored = exam.attempts.filter((attempt) => !attempt.score).length;
    return {
      exam,
      unscored,
      scored: exam.attempts.length - unscored,
      published: exam.attempts.filter((attempt) => attempt.score?.publicationStatus === "PUBLISHED").length,
      review: exam.attempts.filter((attempt) => attempt.integrityLevel !== "NORMAL" && !attempt.integrityReviewedAt).length,
      stage: publicationStageOf({ ...exam, unscored }, now),
    };
  });
  const counts = new Map<string, number>([
    ["kuyruk", rows.filter((row) => row.stage === "PUANLANIYOR" || row.stage === "INCELEME").length],
    ["tumu", rows.length],
    ...PUBLICATION_STAGES.map((stage) => [stage.id, rows.filter((row) => row.stage === stage.id).length] as [string, number]),
  ]);
  const shown = rows.filter((row) =>
    tab === "tumu" ? true : tab === "kuyruk" ? row.stage === "PUANLANIYOR" || row.stage === "INCELEME" : row.stage === tab,
  );

  return { tab, rows, shown, counts };
}
