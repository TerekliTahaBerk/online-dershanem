import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffApi, staffJson, staffNotFound, staffFeatureDisabled, PRIVATE_NO_STORE } from "@/lib/panel/staff-api";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { loadTeacherAiDrafts, createTeacherAiDraft, reviewTeacherAiDraft, teacherAiReviewSchema, teacherAiLessonScope } from "@/lib/panel/teacher-ai-drafts-server";
import { runEducationMutation } from "@/lib/panel/education-write";
import { GroupMutationError, operationDigest, readGroupReceipt } from "@/lib/panel/group-mutation-core";
import { prisma } from "@/lib/prisma";
import { guardMutation } from "@/lib/security/mutation-guard";
const commandSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("create"), lessonId: z.string().min(1).max(80), taskType: z.enum(["ASSIGNMENT", "MINI_CHECK"]) }).strict(),
  z.object({ operation: z.literal("review"), id: z.string().min(1).max(100), input: teacherAiReviewSchema }).strict(),
]);
const controls = z.object({ key: z.string().uuid(), revision: z.string().regex(/^[a-f0-9]{64}$/) });
export async function GET() {
  const auth = await requireStaffApi("OD", "od:lesson:teach"); if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().teacherAiDrafts) return staffFeatureDisabled("AI taslak pilotu henüz açık değil.");
  return staffJson(await loadTeacherAiDrafts(auth.session.userId));
}
export async function POST(request: Request) {
  const auth = await requireStaffApi("OD", "od:lesson:teach"); if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().teacherAiDrafts) return staffFeatureDisabled("AI taslak pilotu henüz açık değil.");
  const guard = await guardMutation({ action: "panel.teacher.ai_drafts", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:ai-draft:${auth.session.userId}`, rateLimit: { max: 20, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { headers: PRIVATE_NO_STORE, status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = commandSchema.safeParse(await request.json().catch(() => null));
  const control = controls.safeParse({ key: request.headers.get("X-Od-Idempotency-Key"), revision: request.headers.get("X-Od-Expected-Revision") });
  if (!parsed.success || !control.success) return NextResponse.json({ error: "İşlem, anahtar veya sürüm geçersiz." }, { headers: PRIVATE_NO_STORE, status: 400 });
  const actorId = auth.session.userId, command = parsed.data;
  const scope = command.operation === "create"
    ? await prisma.lesson.findFirst({ where: { id: command.lessonId, ...teacherAiLessonScope(actorId) }, select: { id: true } })
    : await prisma.teacherAiDraft.findFirst({ where: { id: command.id, teacherId: actorId, lesson: teacherAiLessonScope(actorId) }, select: { id: true } });
  if (!scope) return staffNotFound();
  const digest = operationDigest({ command, revision: control.data.revision }); const key = `teacher-ai:${actorId}:${control.data.key}`;
  try {
    // Read committed observes the winning receipt after waiting on the advisory lock;
    // a stale serializable snapshot could otherwise call the paid provider twice.
    const result = await runEducationMutation({ lockName: `teacher-ai-mutation:${actorId}`, isolationLevel: "ReadCommitted", key, digest, kind: "ai-draft", targetKind: "ai-draft", actorId, action: `teacher.ai.${command.operation}`, execute: async (db) => {
      const data = await loadTeacherAiDrafts(actorId, db);
      const row = command.operation === "create" ? data.lessons.find((l) => l.id === command.lessonId) : data.drafts.find((d) => d.id === command.id);
      if (!row) throw new GroupMutationError("NOT_FOUND", "Kayıt bulunamadı.", 404);
      if (row.revision !== control.data.revision) throw new GroupMutationError("AI_CONFLICT", "Kaynak veya taslak değişti. Güncel görünümü kontrol edin.");
      const response = command.operation === "create" ? await createTeacherAiDraft({ lessonId: command.lessonId, taskType: command.taskType, requestKey: control.data.key }, actorId, db) : await reviewTeacherAiDraft(command.id, command.input, actorId, db);
      const body = await response.json(); if (!response.ok) throw new GroupMutationError("AI_CONFLICT", body.error, response.status);
      // Receipts/audit contain only identifiers: never copy prompts or draft content.
      return Response.json({ ok: true, id: command.operation === "create" ? body.draft.id : command.id });
    } });
    return staffJson({ ...(result.body as object), replayed: result.replayed });
  } catch (error) {
    if (error instanceof GroupMutationError) return NextResponse.json({ error: error.message, code: error.code }, { headers: PRIVATE_NO_STORE, status: error.status });
    if (typeof error === "object" && error && "code" in error && ["P2002", "P2034", "P2025"].includes(String(error.code))) {
      const receipt = await prisma.auditLog.findUnique({ where: { idempotencyKey: key } });
      if (receipt) { try { return staffJson({ ...(readGroupReceipt(receipt.payload, digest).body as object), replayed: true }); } catch (conflict) { if (conflict instanceof GroupMutationError) return NextResponse.json({ error: conflict.message, code: conflict.code }, { headers: PRIVATE_NO_STORE, status: conflict.status }); throw conflict; } }
      return NextResponse.json({ error: "Taslak değişti. Listeyi yenileyin.", code: "AI_CONFLICT" }, { headers: PRIVATE_NO_STORE, status: 409 });
    }
    throw error;
  }
}
