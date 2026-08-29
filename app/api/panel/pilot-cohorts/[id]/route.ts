import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPilotReadiness } from "@/lib/pilot-readiness-server";
import { pilotTransitionAllowed } from "@/lib/pilot-rollout";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { logAudit } from "@/lib/audit";

const schema = z.object({ action: z.enum(["ACTIVATE", "PAUSE", "RESUME", "COMPLETE", "ROLLBACK"]), expectedVersion: z.number().int().positive(), stopReason: z.enum(["GUARDRAIL_BREACH", "SECURITY_INCIDENT", "DATA_QUALITY", "OPERATIONAL", "MANUAL_COMPLETION"]).optional() }).strict();
const memberBand = (count: number) => count <= 4 ? "1-4" as const : count <= 12 ? "5-12" as const : "13+" as const;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOdRole("ADMIN"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.pilot.transition", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:pilot-transition:${auth.session.userId}`, rateLimit: { max: 30, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Pilot geçişini kontrol edin." }, { status: 400 });
  const { id } = await context.params;
  const cohort = await prisma.pilotCohort.findUnique({ where: { id }, include: { members: { select: { role: true } } } });
  if (!cohort) return NextResponse.json({ error: "Pilot kohortu bulunamadı." }, { status: 404 });
  if (cohort.version !== parsed.data.expectedVersion) return NextResponse.json({ error: "Pilot başka bir yönetici tarafından güncellendi. Sayfayı yenileyin." }, { status: 409 });
  if (!pilotTransitionAllowed(cohort.status, parsed.data.action)) return NextResponse.json({ error: "Bu pilot durumunda seçilen geçiş yapılamaz." }, { status: 409 });
  if (["PAUSE", "ROLLBACK"].includes(parsed.data.action) && !parsed.data.stopReason) return NextResponse.json({ error: "Durdurma nedeni seçilmelidir." }, { status: 400 });
  const readiness = await getPilotReadiness(cohort.members.map((member) => member.role));
  if (["ACTIVATE", "RESUME"].includes(parsed.data.action) && !readiness.canActivate) return NextResponse.json({ error: "Pilot aktivasyon kapıları tamamlanmadı.", checks: readiness.checks }, { status: 409 });
  const status = parsed.data.action === "ACTIVATE" || parsed.data.action === "RESUME" ? "ACTIVE" : parsed.data.action === "PAUSE" ? "PAUSED" : parsed.data.action === "COMPLETE" ? "COMPLETED" : "ROLLED_BACK";
  const now = new Date(); const stopReason = parsed.data.action === "COMPLETE" ? "MANUAL_COMPLETION" : parsed.data.stopReason;
  const result = await prisma.pilotCohort.updateMany({ where: { id, version: cohort.version, status: cohort.status }, data: { status, version: { increment: 1 }, startedAt: parsed.data.action === "ACTIVATE" ? now : undefined, stoppedAt: ["PAUSE", "COMPLETE", "ROLLBACK"].includes(parsed.data.action) ? now : parsed.data.action === "RESUME" ? null : undefined, stopReason: ["PAUSE", "COMPLETE", "ROLLBACK"].includes(parsed.data.action) ? stopReason : parsed.data.action === "RESUME" ? null : undefined } });
  if (!result.count) return NextResponse.json({ error: "Pilot durumu çakıştı. Sayfayı yenileyin." }, { status: 409 });
  const updated = await prisma.pilotCohort.findUniqueOrThrow({ where: { id } });
  await recordPanelProductEvent({ name: "pilot_cohort_changed", properties: { action: parsed.data.action, memberBand: memberBand(cohort.members.length), fourRoleCoverage: Object.values(readiness.coverage).every((count) => count > 0), readiness: readiness.canExpand ? "PASS" : readiness.canActivate ? "WAIT" : "BLOCK" } }, auth.session.role);
  await logAudit({ actorUserId: auth.session.userId, entityType: "PilotCohort", entityId: id, action: `pilot.${parsed.data.action.toLowerCase()}`, summary: `Pilot durumu ${status} olarak güncellendi`, payload: { from: cohort.status, to: status, stopReason: stopReason || null, version: updated.version, readiness: readiness.canExpand ? "PASS" : readiness.canActivate ? "WAIT" : "BLOCK" } });
  return NextResponse.json({ cohort: updated, readiness });
}
