import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { buildSafeTeacherAiSource, aiDraftTaskSchema, TEACHER_AI_PROMPT_VERSION } from "@/lib/teacher-ai";
import { generateTeacherAiDraft } from "@/lib/teacher-ai-gateway";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { logAudit } from "@/lib/audit";

const schema = z.object({ lessonId: z.string().min(1).max(80), taskType: aiDraftTaskSchema, requestKey: z.string().uuid() }).strict();
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

export async function POST(request: Request) {
  const auth = await requireApiRole("TEACHER"); if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().teacherAiDrafts) return NextResponse.json({ error: "AI taslak pilotu henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.ai_draft.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:ai-draft:${auth.session.userId}`, rateLimit: { max: 20, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ders ve taslak türünü kontrol edin." }, { status: 400 });
  const replay = await prisma.teacherAiDraft.findFirst({ where: { requestKey: parsed.data.requestKey, teacherId: auth.session.userId } });
  if (replay) return NextResponse.json({ draft: replay, replayed: true });
  const lesson = await prisma.lesson.findFirst({ where: { id: parsed.data.lessonId, teacherId: auth.session.userId, status: { not: "CANCELLED" }, group: { isActive: true } }, select: { id: true, title: true, group: { select: { subject: true, level: true, enrollments: { where: { endedAt: null }, select: { student: { select: { user: { select: { fullName: true } } } } } } } }, notes: { where: { studentId: null }, orderBy: { updatedAt: "desc" }, take: 1, select: { topic: true, note: true, nextGoal: true, homework: true } }, outcomeLinks: { take: 3, select: { outcome: { select: { code: true, title: true } } } } } });
  if (!lesson) return NextResponse.json({ error: "Yetkili olduğunuz ders bulunamadı." }, { status: 404 });
  const shared = lesson.notes[0];
  const prepared = buildSafeTeacherAiSource({ taskType: parsed.data.taskType, subject: lesson.group.subject, level: lesson.group.level, lessonTitle: lesson.title, topic: shared?.topic || null, sharedNote: shared?.note || null, nextGoal: shared?.nextGoal || null, homework: shared?.homework || null, outcomes: lesson.outcomeLinks.map((item) => item.outcome) }, lesson.group.enrollments.flatMap((item) => item.student.user.fullName ? [item.student.user.fullName] : []));
  const since = new Date(); since.setHours(0, 0, 0, 0);
  const [dailyCount, dailyCost] = await Promise.all([prisma.teacherAiDraft.count({ where: { teacherId: auth.session.userId, createdAt: { gte: since } } }), prisma.teacherAiDraft.aggregate({ where: { teacherId: auth.session.userId, createdAt: { gte: since } }, _sum: { estimatedCostMicrousd: true } })]);
  const maxDaily = boundedInteger(process.env.AI_DRAFT_MAX_DAILY_REQUESTS, 10, 1, 50);
  const maxCost = boundedInteger(process.env.AI_DRAFT_MAX_DAILY_MICRO_USD, 100_000, 1_000, 10_000_000);
  const forcedReason = prepared.injectionDetected ? "PROMPT_INJECTION" : dailyCount >= maxDaily || (dailyCost._sum.estimatedCostMicrousd || 0) >= maxCost ? "DAILY_QUOTA" : undefined;
  await recordPanelProductEvent({ name: "ai_draft_requested", properties: { promptVersion: TEACHER_AI_PROMPT_VERSION, taskType: parsed.data.taskType, sourceCount: prepared.safe.sources.length, redactionBand: redactionBand(prepared.redactionCount) } }, auth.session.role);
  const generated = await generateTeacherAiDraft(prepared.safe, { forceFallbackReason: forcedReason });
  try {
    const draft = await prisma.teacherAiDraft.create({ data: { teacherId: auth.session.userId, lessonId: lesson.id, taskType: parsed.data.taskType, provider: generated.provider, promptVersion: TEACHER_AI_PROMPT_VERSION, modelName: generated.modelName, sourceHash: prepared.sourceHash, sourceRefs: prepared.safe.sources.map((item) => ({ id: item.id, label: item.label })) as Prisma.InputJsonValue, originalContent: generated.content as Prisma.InputJsonValue, fallbackReason: generated.fallbackReason, redactionCount: prepared.redactionCount, latencyMs: generated.latencyMs, inputTokens: generated.inputTokens, outputTokens: generated.outputTokens, estimatedCostMicrousd: generated.estimatedCostMicrousd, requestKey: parsed.data.requestKey } });
    await recordPanelProductEvent({ name: "ai_draft_generated", properties: { taskType: parsed.data.taskType, provider: generated.provider, latencyBand: latencyBand(generated.latencyMs), citationCount: generated.content.citations.length, fallbackReason: fallbackReason(generated.fallbackReason), costBand: costBand(generated.estimatedCostMicrousd) } }, auth.session.role);
    await logAudit({ actorUserId: auth.session.userId, entityType: "TeacherAiDraft", entityId: draft.id, action: "teacher_ai_draft.generated", summary: "Kaynaklı öğretmen taslağı üretildi", payload: { taskType: draft.taskType, provider: draft.provider, promptVersion: draft.promptVersion, sourceCount: prepared.safe.sources.length, redactionCount: prepared.redactionCount, fallbackReason: draft.fallbackReason } });
    return NextResponse.json({ draft, replayed: false });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") { const duplicate = await prisma.teacherAiDraft.findFirst({ where: { requestKey: parsed.data.requestKey, teacherId: auth.session.userId } }); if (duplicate) return NextResponse.json({ draft: duplicate, replayed: true }); }
    throw error;
  }
}
