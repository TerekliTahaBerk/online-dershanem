import "server-only";
import type { OdkExamStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOdkExamReadiness } from "./admin-exam-server";
import { listActiveExamFamilies } from "@/lib/products/registry";
import { ODK_EXAM_VIEWS, defaultExamView, examViewOf, isOdkExamView, type OdkExamViewId } from "./staff-workspace";
import { SUBMITTED_STATUSES, loadStaffViewer } from "./staff-management-data";
const statuses: OdkExamStatus[] = ["DRAFT", "READY", "SCHEDULED", "LIVE", "ENDED", "SCORED", "RELEASED", "ARCHIVED"];
const READINESS_ROW_LIMIT = 25;
export async function loadOdkExamList(actorId: string, params: { q?: string; aile?: string; durum?: string; gorunum?: string }) {
  const viewer = await loadStaffViewer(actorId);
  const canCreate = viewer.permissions.has("odk:exam:edit");
  const familyRecords = await listActiveExamFamilies();
  const familyRecord = familyRecords.find((item) => item.code === params.aile);
  const status = statuses.includes(params.durum as OdkExamStatus) ? (params.durum as OdkExamStatus) : undefined;
  const view: OdkExamViewId = status ? "tumu" : isOdkExamView(params.gorunum) ? params.gorunum : defaultExamView(viewer);
  const query = params.q?.trim().slice(0, 80) || "";
  const where: Prisma.OdkExamWhereInput = {
    ...(familyRecord ? { examFamilyRefId: familyRecord.id } : {}),
    ...(status ? { status } : {}),
    ...(query ? { title: { contains: query, mode: "insensitive" } } : {}),
  };
  const now = new Date();
  const [series, exams] = await Promise.all([
    canCreate
      ? prisma.odkExamSeries.findMany({
          where: { isActive: true },
          orderBy: [{ title: "asc" }],
          select: { id: true, title: true, family: true, examFamilyRef: { select: { code: true } } },
        })
      : Promise.resolve([]),
    prisma.odkExam.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        startsAt: true,
        endsAt: true,
        family: true,
        examFamilyRef: { select: { code: true } },
        series: { select: { title: true } },
        _count: {
          select: {
            assignments: { where: { isActive: true } },
            attempts: { where: { status: { not: "VOID" } } },
          },
        },
        attempts: { where: { status: { in: [...SUBMITTED_STATUSES] } }, select: { id: true } },
      },
    }),
  ]);

  const counts = new Map<OdkExamViewId, number>(ODK_EXAM_VIEWS.map((item) => [item.id, 0]));
  for (const exam of exams) {
    const id = examViewOf(exam, now);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  counts.set("tumu", exams.filter((exam) => exam.status !== "ARCHIVED").length);
  const shown = exams.filter((exam) => (view === "tumu" ? status === "ARCHIVED" || exam.status !== "ARCHIVED" : examViewOf(exam, now) === view));
  const drafts = shown.filter((exam) => exam.status === "DRAFT").slice(0, READINESS_ROW_LIMIT);
  const blockingByExam = new Map(
    await Promise.all(
      drafts.map(async (exam) => {
        const { issues } = await getOdkExamReadiness(exam.id);
        return [exam.id, issues.filter((issue) => issue.level === "error").length] as const;
      }),
    ),
  );

  return { now, viewer, canCreate, familyRecords, familyRecord, status, view, query, series, shown, counts, blockingByExam };
}
