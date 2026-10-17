import { NextResponse } from "next/server";
import { z } from "zod";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PRIVATE_NO_STORE, requireStaffApi, staffFeatureDisabled, staffJson } from "@/lib/panel/staff-api";
import { canWriteTeacherIntervention, loadTeacherInterventions } from "@/lib/panel/teacher-interventions-server";
import { createInterventionRecord, updateInterventionRecord, interventionCreateSchema, interventionUpdateSchema } from "@/lib/panel/intervention-write-server";
import { generateInterventionEpisodes } from "@/lib/intervention-server";
import { runEducationMutation } from "@/lib/panel/education-write";
import { GroupMutationError, operationDigest, readGroupReceipt } from "@/lib/panel/group-mutation-core";
import { prisma } from "@/lib/prisma";
import { guardMutation } from "@/lib/security/mutation-guard";

export async function GET() {
  const auth = await requireStaffApi("OD", "od:lesson:teach");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().interventionInbox) return staffFeatureDisabled("Müdahale kutusu şu an kullanıma kapalı, çok yakında açılacak.");
  return staffJson(await loadTeacherInterventions(auth.session.userId));
}
const command = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("create"), input: interventionCreateSchema }).strict(),
  z.object({ operation: z.literal("update"), id: z.string().min(1).max(100), input: interventionUpdateSchema }).strict(),
  z.object({ operation: z.literal("generate") }).strict(),
]);
const controls = z.object({ key: z.string().uuid(), revision: z.string().regex(/^[a-f0-9]{64}$/) });
const failure = (error: GroupMutationError) => NextResponse.json({ error: error.message, code: error.code }, { headers: PRIVATE_NO_STORE, status: error.status });
export async function POST(request: Request) {
  const auth = await requireStaffApi("OD", "od:lesson:teach");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().interventionInbox) return staffFeatureDisabled("Müdahale kutusu şu an kullanıma kapalı, çok yakında açılacak.");
  const guard = await guardMutation({ action: "panel.teacher.interventions", requireSameOrigin: true, headers: request.headers, rateLimitKey: `teacher:interventions:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { headers: PRIVATE_NO_STORE, status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = command.safeParse(await request.json().catch(() => null));
  const control = controls.safeParse({ key: request.headers.get("X-Od-Idempotency-Key"), revision: request.headers.get("X-Od-Expected-Revision") });
  if (!parsed.success || !control.success) return NextResponse.json({ error: "İşlem, anahtar veya sürüm geçersiz." }, { headers: PRIVATE_NO_STORE, status: 400 });
  const input = parsed.data;
  // Authorization precedes receipt replay, including ended enrollments and transferred ownership.
  if (!await canWriteTeacherIntervention(auth.session.userId, input)) return failure(new GroupMutationError("NOT_FOUND", "Aradığınız kaydı bulamadık.", 404));
  const digest = operationDigest({ command: input, revision: control.data.revision });
  const key = `teacher-intervention:${auth.session.userId}:${control.data.key}`;
  try {
    const result = await runEducationMutation({ kind: "intervention", targetKind: "student", key, digest, actorId: auth.session.userId, action: `intervention.${input.operation}`, execute: async (db) => {
      if (!await canWriteTeacherIntervention(auth.session.userId, input, db)) throw new GroupMutationError("NOT_FOUND", "Aradığınız kaydı bulamadık.", 404);
      const current = await loadTeacherInterventions(auth.session.userId, db);
      if (current.revision !== control.data.revision) throw new GroupMutationError("INTERVENTION_CONFLICT", "Kayıtlar veya öğrenci kapsamı değişti. Güncel hâline göz atıp tekrar deneyebilirsiniz.");
      const actor = { role: "TEACHER" as const, userId: auth.session.userId };
      let response: Response;
      if (input.operation === "create") response = await createInterventionRecord(input.input, actor, db);
      else if (input.operation === "update") response = await updateInterventionRecord(input.id, input.input, actor, db);
      else {
        const generated = await generateInterventionEpisodes({ teacherId: actor.userId }, db);
        response = NextResponse.json({ createdCount: generated.created.length, reactivatedCount: generated.reactivatedCount, evaluatedStudentCount: generated.evaluatedStudentCount });
      }
      if (!response.ok) { const body = await response.json(); throw new GroupMutationError("INTERVENTION_REJECTED", body.error, response.status); }
      return response;
    } });
    return staffJson({ ...(result.body as object), replayed: result.replayed });
  } catch (error) {
    if (error instanceof GroupMutationError) return failure(error);
    if (typeof error === "object" && error && "code" in error && ["P2034", "P2002", "P2025"].includes(String(error.code))) {
      const receipt = await prisma.auditLog.findUnique({ where: { idempotencyKey: key } });
      if (receipt) {
        try { const replay = readGroupReceipt(receipt.payload, digest); return staffJson({ ...(replay.body as object), replayed: true }); }
        catch (conflict) { if (conflict instanceof GroupMutationError) return failure(conflict); throw conflict; }
      }
      return failure(new GroupMutationError("INTERVENTION_CONFLICT", "Kayıt bu arada güncellenmiş. Güncel hâline göz atıp tekrar deneyebilirsiniz."));
    }
    throw error;
  }
}
