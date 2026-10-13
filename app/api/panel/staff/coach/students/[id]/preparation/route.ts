import { NextResponse } from "next/server";
import { z } from "zod";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { requireStaffApi, staffJson, staffNotFound, staffFeatureDisabled, PRIVATE_NO_STORE } from "@/lib/panel/staff-api";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { coachPreparationScope, loadCoachPreparation, coachRecordSchema, coachGoalSchema, recordCoachSession, setCoachGoal } from "@/lib/panel/coach-preparation-server";
import { coachTaskSchema, coachCopySchema, coachSummarySchema, createCoachTask, copyCoachPlan, saveCoachSummary } from "@/lib/panel/coach-preparation-operations";
import { applyTemplateToStudentWeek } from "@/lib/kocum/server";
import { runEducationMutation } from "@/lib/panel/education-write";
import { operationDigest, GroupMutationError, readGroupReceipt } from "@/lib/panel/group-mutation-core";
import { prisma } from "@/lib/prisma";
import { guardMutation } from "@/lib/security/mutation-guard";

const commandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("task"), payload: coachTaskSchema.omit({ studentId: true, weekStart: true, sourceType: true, sourceReferenceId: true }).strict() }).strict(),
  z.object({ action: z.literal("copy"), planId: z.string().min(1).max(100), payload: coachCopySchema.strict() }).strict(),
  z.object({ action: z.literal("template"), templateId: z.string().min(1).max(100) }).strict(),
  z.object({ action: z.literal("summary"), payload: coachSummarySchema.omit({ studentId: true, weekStart: true }).strict() }).strict(),
  z.object({ action: z.literal("record"), payload: coachRecordSchema.omit({ studentId: true }).strict() }).strict(),
  z.object({ action: z.literal("goal"), payload: coachGoalSchema }).strict(),
]);
const controls = z.object({ key: z.string().uuid(), revision: z.string().regex(/^[a-f0-9]{64}$/) });
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  const auth = await requireStaffApi("OK", "ok:coaching:write"); if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().adaptivePlan) return staffFeatureDisabled("Koç hazırlığı henüz açık değil.");
  const params = idParamsSchema.safeParse(await context.params); if (!params.success) return invalidApiInput();
  const data = await loadCoachPreparation(auth.session.userId, params.data.id);
  return data ? staffJson(data) : staffNotFound();
}
export async function POST(request: Request, context: Context) {
  const auth = await requireStaffApi("OK", "ok:coaching:write"); if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().adaptivePlan) return staffFeatureDisabled("Koç hazırlığı henüz açık değil.");
  const params = idParamsSchema.safeParse(await context.params); if (!params.success) return invalidApiInput();
  const guard = await guardMutation({ action: "panel.coach.preparation", requireSameOrigin: true, headers: request.headers, rateLimitKey: `coach:preparation:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { headers: PRIVATE_NO_STORE, status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = commandSchema.safeParse(await request.json().catch(() => null));
  const control = controls.safeParse({ key: request.headers.get("X-Od-Idempotency-Key"), revision: request.headers.get("X-Od-Expected-Revision") });
  if (!parsed.success || !control.success) return NextResponse.json({ error: "İşlem, anahtar veya sürüm geçersiz." }, { headers: PRIVATE_NO_STORE, status: 400 });
  const studentId = params.data.id, actorId = auth.session.userId;
  if (!await coachPreparationScope(actorId, studentId)) return staffNotFound();
  const digest = operationDigest({ studentId, command: parsed.data, revision: control.data.revision }); const key = `coach-preparation:${actorId}:${control.data.key}`;
  try {
    const result = await runEducationMutation({ kind: "coaching", targetKind: "student", key, actorId, action: `coach.preparation.${parsed.data.action}`, digest, execute: async (db) => {
      const data = await loadCoachPreparation(actorId, studentId, db);
      if (!data) throw new GroupMutationError("NOT_FOUND", "Öğrenci bulunamadı.", 404);
      if (data.revision !== control.data.revision) throw new GroupMutationError("COACH_CONFLICT", "Hazırlık verileri değişti. Güncel görünümü kontrol edin.");
      const command = parsed.data; let response: Response;
      if (command.action === "record") return Response.json(await recordCoachSession({ ...command.payload, studentId }, actorId, db));
      if (command.action === "goal") {
        if (command.payload.studentId !== studentId) throw new GroupMutationError("NOT_FOUND", "Öğrenci bulunamadı.", 404);
        return Response.json(await setCoachGoal(command.payload, actorId, db));
      }
      if (command.action === "template") {
        if (!data.templates.some((t) => t.id === command.templateId)) throw new GroupMutationError("NOT_FOUND", "Şablon bulunamadı.", 404);
        const result = await applyTemplateToStudentWeek({ templateId: command.templateId, studentId, weekStart: new Date(data.weekStart), actorUserId: actorId }, db);
        if (!result.ok) throw new GroupMutationError("COACH_CONFLICT", result.error);
        return Response.json({ ok: true, id: result.planId });
      }
      if (command.action === "task") {
        const day = new Date(command.payload.scheduledFor).getTime(); const week = new Date(data.weekStart).getTime();
        if (day < week || day >= week + 7 * 86400000) throw new GroupMutationError("INVALID_DATE", "Görev plan haftası içinde olmalı.", 400);
        response = await createCoachTask(coachTaskSchema.parse({ ...command.payload, studentId, weekStart: data.weekStart }), actorId, auth.session.fullName || "Koç", db);
      } else if (command.action === "copy") {
        if (!data.plans.some((p) => p.id === command.planId)) throw new GroupMutationError("NOT_FOUND", "Plan bulunamadı.", 404);
        response = await copyCoachPlan(command.payload, actorId, auth.session.fullName || "Koç", db, command.planId);
      } else response = await saveCoachSummary({ ...command.payload, studentId, weekStart: data.weekStart }, actorId, auth.session.fullName || "Koç", db);
      const body = await response.json();
      if (!response.ok) throw new GroupMutationError("COACH_CONFLICT", body.error, response.status);
      return Response.json({ ok: true, id: body.taskId || body.planId || body.summaryId });
    } });
    return staffJson({ ...(result.body as object), replayed: result.replayed });
  } catch (error) {
    if (error instanceof GroupMutationError) return NextResponse.json({ error: error.message, code: error.code }, { headers: PRIVATE_NO_STORE, status: error.status });
    if (typeof error === "object" && error && "code" in error && ["P2034", "P2002", "P2025"].includes(String(error.code))) {
      const receipt = await prisma.auditLog.findUnique({ where: { idempotencyKey: key } });
      if (receipt) {
        try { return staffJson({ ...(readGroupReceipt(receipt.payload, digest).body as object), replayed: true }); }
        catch (conflict) { if (conflict instanceof GroupMutationError) return NextResponse.json({ error: conflict.message, code: conflict.code }, { headers: PRIVATE_NO_STORE, status: conflict.status }); throw conflict; }
      }
      return NextResponse.json({ error: "Kayıt değişti. Görünümü yenileyin.", code: "COACH_CONFLICT" }, { headers: PRIVATE_NO_STORE, status: 409 });
    }
    throw error;
  }
}
