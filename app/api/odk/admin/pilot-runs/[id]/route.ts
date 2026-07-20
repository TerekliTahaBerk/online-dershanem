import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { logAudit } from "@/lib/audit";
import { getOdkPilotReadiness } from "@/lib/odk/pilot-readiness-server";
import { odkPilotTransitionAllowed } from "@/lib/odk/pilot-rollout";

const schema = z.object({ action: z.enum(["ACTIVATE", "PAUSE", "RESUME", "COMPLETE", "ROLLBACK"]), expectedVersion: z.number().int().positive(), stopReason: z.enum(["GUARDRAIL_BREACH", "SECURITY_INCIDENT", "DATA_QUALITY", "OPERATIONAL", "MANUAL_COMPLETION"]).optional() }).strict();

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.pilot.transition", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:pilot-transition:${auth.session.userId}`, rateLimit: { max: 20, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Pilot geçişini kontrol edin." }, { status: 400 });
  const { id } = await context.params;
  const run = await prisma.odkPilotRun.findUnique({ where: { id }, include: { members: { select: { role: true } } } });
  if (!run) return NextResponse.json({ error: "ODK pilot koşusu bulunamadı." }, { status: 404 });
  if (run.version !== parsed.data.expectedVersion) return NextResponse.json({ error: "Pilot başka bir yönetici tarafından güncellendi. Sayfayı yenileyin." }, { status: 409 });
  if (!odkPilotTransitionAllowed(run.status, parsed.data.action)) return NextResponse.json({ error: "Bu pilot durumunda seçilen geçiş yapılamaz." }, { status: 409 });
  if (["PAUSE", "ROLLBACK"].includes(parsed.data.action) && !parsed.data.stopReason) return NextResponse.json({ error: "Durdurma nedeni seçilmelidir." }, { status: 400 });
  const readiness = await getOdkPilotReadiness(run.members.map((member) => member.role));
  if (["ACTIVATE", "RESUME"].includes(parsed.data.action) && !readiness.canActivate) return NextResponse.json({ error: "ODK pilot aktivasyon kapıları tamamlanmadı.", checks: readiness.checks }, { status: 409 });
  const status = parsed.data.action === "ACTIVATE" || parsed.data.action === "RESUME" ? "ACTIVE" : parsed.data.action === "PAUSE" ? "PAUSED" : parsed.data.action === "COMPLETE" ? "COMPLETED" : "ROLLED_BACK";
  const now = new Date(); const stopReason = parsed.data.action === "COMPLETE" ? "MANUAL_COMPLETION" : parsed.data.stopReason;
  const updatedCount = await prisma.odkPilotRun.updateMany({ where: { id, version: run.version, status: run.status }, data: { status, version: { increment: 1 }, startedAt: parsed.data.action === "ACTIVATE" ? now : undefined, stoppedAt: ["PAUSE", "COMPLETE", "ROLLBACK"].includes(parsed.data.action) ? now : parsed.data.action === "RESUME" ? null : undefined, stopReason: ["PAUSE", "COMPLETE", "ROLLBACK"].includes(parsed.data.action) ? stopReason : parsed.data.action === "RESUME" ? null : undefined } });
  if (!updatedCount.count) return NextResponse.json({ error: "Pilot durumu çakıştı. Sayfayı yenileyin." }, { status: 409 });
  const updated = await prisma.odkPilotRun.findUniqueOrThrow({ where: { id } });
  await logAudit({ actorUserId: auth.session.userId, entityType: "OdkPilotRun", entityId: id, action: `odk.pilot_${parsed.data.action.toLowerCase()}`, summary: `ODK pilot durumu ${status} olarak güncellendi`, payload: { from: run.status, to: status, stopReason: stopReason || null, version: updated.version, readiness: readiness.canExpand ? "PASS" : readiness.canActivate ? "WAIT" : "BLOCK" } });
  return NextResponse.json({ run: updated, readiness });
}
