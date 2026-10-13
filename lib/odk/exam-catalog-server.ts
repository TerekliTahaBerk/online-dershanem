import "server-only";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { operationDigest } from "@/lib/panel/group-mutation-core";
import { ODK_EXAM_TEMPLATES, templateTotalQuestions } from "./exam-templates";
import { asLegacyOdkExamFamily } from "./exam-family";
export async function loadOdkExamCatalog(db: PrismaClient = prisma) {
  const [families, series, curricula, policies] = await Promise.all([
    db.examFamily.findMany({ where: { isActive: true, product: { isActive: true } }, orderBy: [{ name: "asc" }, { code: "asc" }] }),
    db.odkExamSeries.findMany({ where: { isActive: true }, orderBy: [{ title: "asc" }, { id: "asc" }], select: { id: true, title: true, examFamilyRef: { select: { code: true } }, updatedAt: true } }),
    db.curriculumSubject.findMany({ where: { version: { status: { in: ["DRAFT", "ACTIVE"] } } }, orderBy: { id: "asc" }, select: { id: true, code: true, name: true, position: true, version: { select: { id: true, status: true, academicYear: true, examFamilyRefId: true } } } }),
    db.odkScoringPolicy.findMany({ orderBy: { code: "asc" } }),
  ]);
  const templates = Object.values(ODK_EXAM_TEMPLATES).map((t) => ({ code: t.code, familyCode: t.family, label: t.label, mode: t.structureMode, durationMinutes: t.durationMinutes, questionCount: templateTotalQuestions(t), sections: t.sections.map((s) => ({ title: s.title, questionCount: s.questionCount })) }));
  return { revision: operationDigest({ families, series, curricula, policies, templates: ODK_EXAM_TEMPLATES }), families: families.map((f) => ({ code: f.code, name: f.name, legacy: Boolean(asLegacyOdkExamFamily(f.code)) })), series: series.filter((s) => families.some((f) => f.code === s.examFamilyRef?.code)).map((s) => ({ id: s.id, title: s.title, familyCode: s.examFamilyRef!.code })), templates };
}
