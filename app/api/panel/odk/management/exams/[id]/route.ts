import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiProductRole, requireApiRecentStaffStepUp, requireApiStaffPermission } from "@/lib/auth/api-guards";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { ODK_EXAM_LIST_PERMISSIONS } from "@/lib/products/staff-permission-matrix";
import { staffJson, PRIVATE_NO_STORE } from "@/lib/panel/staff-api";
import { buildOdkExamScoring, loadOdkExamReport, loadOdkExamWorkspace, loadOdkQuestionOutcomeLabels } from "@/lib/odk/exam-workspace-server";
import { loadExamHistory, loadStaffViewer } from "@/lib/odk/staff-management-data";
import { loadOdkExamAssignments } from "@/lib/odk/exam-assignments-server";
import { toMobileOdkExamWorkspace } from "@/lib/mobile/odk-exam-views";
import { ODK_EXAM_COMMAND_PERMISSION, ODK_EXAM_STEP_UP_OPERATIONS, odkExamCommandSchema, runOdkExamCommand } from "@/lib/odk/exam-command-runner";
import { GroupMutationError } from "@/lib/panel/group-mutation-core";
import { guardMutation } from "@/lib/security/mutation-guard";

/** Puanla / yeniden puanla komutları kalabalık sınıfta birkaç saniye sürer (Faz 7 ölçek testi). */
export const maxDuration = 60;

/**
 * K03 · Deneme çalışma alanı — web `app/panel/odk/yonetim/sinavlar/[id]` ile
 * AYNI yükleyici (`loadOdkExamWorkspace`) ve sekme izinleri.
 */
const querySchema = z.object({ sekme: z.string().max(20).optional(), filtre: z.string().max(20).optional() }).strict();

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "ADMIN", "TEACHER"); if (!auth.ok) return auth.response;
  const params = idParamsSchema.safeParse(await context.params); if (!params.success) return invalidApiInput();
  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return NextResponse.json({ error: "Sekme geçersiz." }, { status: 400, headers: PRIVATE_NO_STORE });
  // İzin, pahalı okumalardan önce (web: requireAnyStaffPermission(ODK_EXAM_LIST_PERMISSIONS)).
  const viewer = await loadStaffViewer(auth.session.userId);
  if (!ODK_EXAM_LIST_PERMISSIONS.some((permission) => viewer.permissions.has(permission))) return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403, headers: PRIVATE_NO_STORE });
  const now = new Date();
  const ws = await loadOdkExamWorkspace(auth.session.userId, params.data.id, query.data, now, { includeOutcomeOptions: false });
  if (!ws) return NextResponse.json({ error: "Deneme bulunamadı.", code: "NOT_FOUND" }, { status: 404, headers: PRIVATE_NO_STORE });
  const [report, history, assignments] = await Promise.all([
    ws.tab === "raporlar" ? loadOdkExamReport(ws.exam.id, ws.assignedCount, ws.attempts) : Promise.resolve(null),
    ws.tab === "gecmis" ? loadExamHistory(ws.exam) : Promise.resolve(null),
    ws.tab === "katilimcilar" ? loadOdkExamAssignments(ws.exam.id) : Promise.resolve(null),
  ]);
  const scoring = ws.tab === "puanlama" ? buildOdkExamScoring(ws) : null;
  const outcomeLabels = ws.tab === "sorular" && ws.caps.edit ? await loadOdkQuestionOutcomeLabels(ws) : null;
  return staffJson(toMobileOdkExamWorkspace(ws, { now, report, history, assignments, scoring, outcomeLabels }));
}

/**
 * K03b · Mobil hazırlık komutları — `runOdkExamCommand` (web uçlarıyla aynı
 * servisler; K03c puanla/yeniden puanla/yayın — son ikisi taze step-up).
 * `X-Od-Idempotency-Key` + `X-Od-Expected-Revision` (çalışma alanı
 * `revision`) zorunlu.
 */
const controls = z.object({ key: z.string().uuid(), revision: z.string().regex(/^[a-f0-9]{64}$/) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = idParamsSchema.safeParse(await context.params); if (!params.success) return invalidApiInput();
  const parsed = odkExamCommandSchema.safeParse(await request.json().catch(() => null));
  const control = controls.safeParse({ key: request.headers.get("X-Od-Idempotency-Key"), revision: request.headers.get("X-Od-Expected-Revision") });
  if (!parsed.success || !control.success) return NextResponse.json({ error: parsed.error?.issues[0]?.message || "İşlem, anahtar veya sürüm geçersiz.", code: "INVALID_INPUT" }, { status: 400, headers: PRIVATE_NO_STORE });
  const command = parsed.data;
  const permission = ODK_EXAM_COMMAND_PERMISSION[command.operation];
  const auth = await (ODK_EXAM_STEP_UP_OPERATIONS.has(command.operation) ? requireApiRecentStaffStepUp(permission) : requireApiStaffPermission(permission)); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: `panel.odk.exam.${command.operation}`, requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:odk-exam:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403, headers: PRIVATE_NO_STORE });
  try {
    const result = await runOdkExamCommand({ examId: params.data.id, actorId: auth.session.userId, actorRole: auth.session.role, idempotencyKey: control.data.key, expectedRevision: control.data.revision, command });
    return staffJson({ ok: true, operation: command.operation, result: result.body, replayed: result.replayed });
  } catch (error) {
    if (error instanceof GroupMutationError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status, headers: PRIVATE_NO_STORE });
    throw error;
  }
}
