import "server-only";
import { NextResponse } from "next/server";
import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildSafeTeacherAiSource, aiDraftTaskSchema, TEACHER_AI_PROMPT_VERSION, aiDraftContentSchema, changedFieldCount, type AiDraftContent } from "@/lib/teacher-ai";
import { generateTeacherAiDraft } from "@/lib/teacher-ai-gateway";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { istanbulDayStart } from "@/lib/istanbul-time";
import { operationDigest } from "./group-mutation-core";
import { afterEducationCommit } from "./education-write";
export const teacherAiCreateSchema = z.object({ lessonId: z.string().min(1).max(80), taskType: aiDraftTaskSchema, requestKey: z.string().uuid() }).strict();
const redactionBand = (count: number) => count === 0 ? "0" as const : count <= 2 ? "1-2" as const : "3+" as const;
const latencyBand = (ms: number) => ms <= 2_000 ? "0-2S" as const : ms <= 8_000 ? "2-8S" as const : "8S+" as const;
const costBand = (cost: number | null) => cost === null ? "UNKNOWN" as const : cost === 0 ? "0" as const : cost < 1_000 ? "1-999" as const : "1000+" as const;
function fallbackReason(value: string | null) {
  if (!value) return "NONE" as const;
  if (["PROVIDER_DISABLED", "EXTERNAL_TRANSFER_NOT_READY", "COST_CONFIG_MISSING", "PROMPT_INJECTION", "DAILY_QUOTA", "E2E_STUB"].includes(value)) return value as "PROVIDER_DISABLED" | "EXTERNAL_TRANSFER_NOT_READY" | "COST_CONFIG_MISSING" | "PROMPT_INJECTION" | "DAILY_QUOTA" | "E2E_STUB";
  if (value.startsWith("PROVIDER_")) return "PROVIDER_ERROR" as const;
  return "SAFETY_OR_PARSE" as const;
}

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.floor(parsed)));
}

async function loadSourceLesson(lessonId: string, actorId: string, db: PrismaClient) {
  return db.lesson.findFirst({ where: { id: lessonId, teacherId: actorId, status: { not: "CANCELLED" }, group: { isActive: true } }, select: { id: true, title: true, group: { select: { subject: true, level: true, enrollments: { where: { endedAt: null }, select: { student: { select: { user: { select: { fullName: true } } } } } } } }, notes: { where: { studentId: null }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: 1, select: { topic: true, note: true, nextGoal: true, homework: true } }, outcomeLinks: { take: 3, orderBy: { outcomeId: "asc" }, select: { outcome: { select: { code: true, title: true } } } } } });
}
function prepareSource(lesson: NonNullable<Awaited<ReturnType<typeof loadSourceLesson>>>, taskType: z.infer<typeof aiDraftTaskSchema>) {
  const shared = lesson.notes[0];
  return buildSafeTeacherAiSource({ taskType, subject: lesson.group.subject, level: lesson.group.level, lessonTitle: lesson.title, topic: shared?.topic || null, sharedNote: shared?.note || null, nextGoal: shared?.nextGoal || null, homework: shared?.homework || null, outcomes: lesson.outcomeLinks.map((item) => item.outcome) }, lesson.group.enrollments.flatMap((item) => item.student.user.fullName ? [item.student.user.fullName] : []));
}

export async function createTeacherAiDraft(input: z.infer<typeof teacherAiCreateSchema>, actorId: string, client: PrismaClient = prisma, generate = generateTeacherAiDraft) {
  const events: Array<() => Promise<void>> = [];
  const response = await client.$transaction(async (tx) => {
    const db = tx as PrismaClient;
    await db.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`teacher-ai-key:${input.requestKey}`}, 0))::text`;
    await db.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`teacher-ai:${actorId}`}, 0))::text`;
    const lesson = await loadSourceLesson(input.lessonId, actorId, db);
    if (!lesson) return NextResponse.json({ error: "Yetkili olduğunuz ders bulunamadı." }, { status: 404 });
    const replay = await db.teacherAiDraft.findUnique({ where: { requestKey: input.requestKey } });
    if (replay) {
      if (replay.teacherId !== actorId || replay.lessonId !== input.lessonId || replay.taskType !== input.taskType) return NextResponse.json({ error: "İşlem anahtarı başka bir istek için kullanıldı." }, { status: 409 });
      return NextResponse.json({ draft: replay, replayed: true });
    }
    const prepared = prepareSource(lesson, input.taskType);
    const since = istanbulDayStart(new Date());
    const [dailyCount, dailyCost] = await Promise.all([db.teacherAiDraft.count({ where: { teacherId: actorId, createdAt: { gte: since } } }), db.teacherAiDraft.aggregate({ where: { teacherId: actorId, createdAt: { gte: since } }, _sum: { estimatedCostMicrousd: true } })]);
    const maxDaily = boundedInteger(process.env.AI_DRAFT_MAX_DAILY_REQUESTS, 10, 1, 50);
    const maxCost = boundedInteger(process.env.AI_DRAFT_MAX_DAILY_MICRO_USD, 100_000, 1_000, 10_000_000);
    const forcedReason = prepared.injectionDetected ? "PROMPT_INJECTION" : dailyCount >= maxDaily || (dailyCost._sum.estimatedCostMicrousd || 0) >= maxCost ? "DAILY_QUOTA" : undefined;
    await recordPanelProductEvent({ name: "ai_draft_requested", properties: { promptVersion: TEACHER_AI_PROMPT_VERSION, taskType: input.taskType, sourceCount: prepared.safe.sources.length, redactionBand: redactionBand(prepared.redactionCount) } }, "TEACHER");
    const generated = await generate(prepared.safe, { forceFallbackReason: forcedReason });
    const latest = await loadSourceLesson(input.lessonId, actorId, db);
    if (!latest) return NextResponse.json({ error: "Yetkili olduğunuz ders bulunamadı." }, { status: 404 });
    if (prepareSource(latest, input.taskType).sourceHash !== prepared.sourceHash) return NextResponse.json({ error: "Taslak hazırlanırken kaynak değişti. Yeniden inceleyin." }, { status: 409 });
    const draft = await db.teacherAiDraft.create({ data: { teacherId: actorId, lessonId: lesson.id, taskType: input.taskType, provider: generated.provider, promptVersion: TEACHER_AI_PROMPT_VERSION, modelName: generated.modelName, sourceHash: prepared.sourceHash, sourceRefs: prepared.safe.sources.map((item) => ({ id: item.id, label: item.label })) as Prisma.InputJsonValue, originalContent: generated.content as Prisma.InputJsonValue, fallbackReason: generated.fallbackReason, redactionCount: prepared.redactionCount, latencyMs: generated.latencyMs, inputTokens: generated.inputTokens, outputTokens: generated.outputTokens, estimatedCostMicrousd: generated.estimatedCostMicrousd, requestKey: input.requestKey } });
    events.push(() => recordPanelProductEvent({ name: "ai_draft_generated", properties: { taskType: input.taskType, provider: generated.provider, latencyBand: latencyBand(generated.latencyMs), citationCount: generated.content.citations.length, fallbackReason: fallbackReason(generated.fallbackReason), costBand: costBand(generated.estimatedCostMicrousd) } }, "TEACHER"));
    await db.auditLog.create({ data: { actorType: "USER", actorUserId: actorId, entityType: "TeacherAiDraft", entityId: draft.id, action: "teacher_ai_draft.generated", summary: "Kaynaklı öğretmen taslağı üretildi", payload: { taskType: draft.taskType, provider: draft.provider, promptVersion: draft.promptVersion, sourceCount: prepared.safe.sources.length, redactionCount: prepared.redactionCount, fallbackReason: draft.fallbackReason } } });
    return NextResponse.json({ draft, replayed: false });

  }, { isolationLevel: "ReadCommitted", timeout: 30000 });
  for (const event of events) await afterEducationCommit(client, event);
  return response;
}

const contentSchema = aiDraftContentSchema.omit({ citations: true });
export const teacherAiReviewSchema = z.object({ action: z.enum(["APPROVE", "REJECT", "FLAG"]), expectedVersion: z.number().int().min(1), content: contentSchema.optional(), flagReason: z.enum(["FACTUAL_ERROR", "UNSUPPORTED_CITATION", "UNSAFE_TONE", "PRIVACY", "OTHER"]).optional() }).strict();
const ageBand = (ms: number) => ms <= 5 * 60_000 ? "0-5M" as const : ms <= 86_400_000 ? "6M-24H" as const : "24H+" as const;


export async function reviewTeacherAiDraft(id: string, input: z.infer<typeof teacherAiReviewSchema>, actorId: string, client: PrismaClient = prisma) {
  const events: Array<() => Promise<void>> = [];
  const response = await client.$transaction(async (tx) => {
    const db = tx as PrismaClient;
    if (input.action === "APPROVE" && !input.content) return NextResponse.json({ error: "Onaylanan içeriği kontrol edin." }, { status: 400 });
    if (input.action === "FLAG" && !input.flagReason) return NextResponse.json({ error: "Kontrollü hata nedeni seçin." }, { status: 400 });
    const draft = await db.teacherAiDraft.findFirst({ where: { id, teacherId: actorId, lesson: { teacherId: actorId, status: { not: "CANCELLED" }, group: { isActive: true } } }, select: { id: true, taskType: true, status: true, provider: true, version: true, createdAt: true, originalContent: true } });
    if (!draft) return NextResponse.json({ error: "Yetkili olduğunuz taslak bulunamadı." }, { status: 404 });
    if (draft.status !== "DRAFT" || draft.version !== input.expectedVersion) return NextResponse.json({ error: "Taslak başka bir işlemde güncellendi." }, { status: 409 });
    const original = aiDraftContentSchema.parse(draft.originalContent); const reviewed = input.content ? { ...input.content, citations: original.citations } satisfies AiDraftContent : null;
    const changed = reviewed ? changedFieldCount(original, reviewed) : 0;
    const result = await db.teacherAiDraft.updateMany({ where: { id, teacherId: actorId, status: "DRAFT", version: input.expectedVersion }, data: { status: input.action === "APPROVE" ? "APPROVED" : input.action === "FLAG" ? "FLAGGED" : "REJECTED", reviewedContent: reviewed as Prisma.InputJsonValue | undefined, flagReason: input.action === "FLAG" ? input.flagReason : null, reviewedAt: new Date(), version: { increment: 1 } } });
    if (!result.count) return NextResponse.json({ error: "Taslak başka bir işlemde güncellendi." }, { status: 409 });
    const action = input.action === "APPROVE" ? (changed ? "EDIT" : "ACCEPT") : input.action === "FLAG" ? "FLAG" : "REJECT";
    events.push(() => recordPanelProductEvent({ name: "ai_draft_reviewed", properties: { taskType: draft.taskType, provider: draft.provider, action, changedFieldCount: changed, reviewAgeBand: ageBand(Date.now() - draft.createdAt.getTime()) } }, "TEACHER"));
    await db.auditLog.create({ data: { actorType: "USER", actorUserId: actorId, entityType: "TeacherAiDraft", entityId: id, action: `teacher_ai_draft.${input.action.toLowerCase()}`, summary: "Öğretmen AI taslağını inceledi", payload: { taskType: draft.taskType, provider: draft.provider, changedFieldCount: changed, flagReason: input.flagReason || null } } });
    return NextResponse.json({ ok: true, status: input.action === "APPROVE" ? "APPROVED" : input.action === "FLAG" ? "FLAGGED" : "REJECTED", version: draft.version + 1 });
  });
  for (const event of events) await afterEducationCommit(client, event);
  return response;
}

export const teacherAiLessonScope = (actorId: string) => ({ teacherId: actorId, status: { not: "CANCELLED" as const }, group: { isActive: true } });
export async function loadTeacherAiDrafts(actorId: string, db: PrismaClient = prisma) {
  const [lessons, drafts] = await Promise.all([
    db.lesson.findMany({ where: { ...teacherAiLessonScope(actorId), startsAt: { gte: new Date(Date.now() - 30 * 86400000) } }, orderBy: [{ startsAt: "desc" }, { id: "asc" }], take: 40,
      select: { id: true, title: true, startsAt: true, status: true, teacherId: true, groupId: true, group: { select: { name: true, subject: true, level: true, enrollments: { where: { endedAt: null }, orderBy: { id: "asc" }, select: { id: true, student: { select: { user: { select: { fullName: true } } } } } } } }, notes: { where: { studentId: null }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: 1, select: { topic: true, note: true, nextGoal: true, homework: true } }, outcomeLinks: { take: 3, orderBy: { outcomeId: "asc" }, select: { outcome: { select: { code: true, title: true } } } } } }),
    db.teacherAiDraft.findMany({ where: { teacherId: actorId, lesson: teacherAiLessonScope(actorId) }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 20, include: { lesson: { select: { title: true } } } }),
  ]);
  return { contractVersion: 1 as const,
    lessons: lessons.map((l) => ({ id: l.id, title: l.title, groupName: l.group.name, startsAt: l.startsAt.toISOString(), revision: operationDigest(l) })),
    drafts: drafts.map((d) => ({ id: d.id, taskType: d.taskType, status: d.status, provider: d.provider, promptVersion: d.promptVersion, modelName: d.modelName, fallbackReason: d.fallbackReason, version: d.version, createdAt: d.createdAt.toISOString(), lessonTitle: d.lesson.title, revision: operationDigest(d), sourceRefs: sourceRefsSchema.parse(d.sourceRefs), originalContent: aiDraftContentSchema.parse(d.originalContent), reviewedContent: d.reviewedContent ? aiDraftContentSchema.parse(d.reviewedContent) : null })),
  };
}
const sourceRefsSchema = z.array(z.object({ id: z.string(), label: z.string() }));
