import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { logAudit } from "@/lib/audit";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { roleCoverage } from "@/lib/pilot-rollout";

const schema = z.object({ groupId: z.string().min(1).max(80), requestKey: z.string().uuid() }).strict();
const memberBand = (count: number) => count <= 4 ? "1-4" as const : count <= 12 ? "5-12" as const : "13+" as const;

export async function POST(request: Request) {
  const auth = await requireApiRole("ADMIN"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.pilot.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:pilot:${auth.session.userId}`, rateLimit: { max: 20, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pilot grubu seçimini kontrol edin." }, { status: 400 });
  const replay = await prisma.pilotCohort.findUnique({ where: { requestKey: parsed.data.requestKey } });
  if (replay) return NextResponse.json({ cohort: replay, replayed: true });
  const existing = await prisma.pilotCohort.findFirst({ where: { groupId: parsed.data.groupId, status: { in: ["DRAFT", "ACTIVE", "PAUSED"] } }, select: { id: true } });
  if (existing) return NextResponse.json({ error: "Bu grup için açık bir pilot kaydı zaten var." }, { status: 409 });
  const group = await prisma.group.findFirst({ where: { id: parsed.data.groupId, isActive: true }, select: { id: true, name: true, teacher: { select: { id: true, role: true, status: true } }, enrollments: { where: { endedAt: null, student: { user: { status: "ACTIVE" } } }, select: { student: { select: { user: { select: { id: true, role: true } }, parents: { where: { parent: { status: "ACTIVE" } }, select: { parent: { select: { id: true, role: true } } } } } } } } } });
  if (!group || group.teacher.status !== "ACTIVE") return NextResponse.json({ error: "Aktif grup ve öğretmen bulunamadı." }, { status: 404 });
  const memberMap = new Map<string, "ADMIN" | "TEACHER" | "STUDENT" | "PARENT">([[auth.session.userId, "ADMIN"], [group.teacher.id, "TEACHER"]]);
  for (const enrollment of group.enrollments) { memberMap.set(enrollment.student.user.id, "STUDENT"); for (const link of enrollment.student.parents) memberMap.set(link.parent.id, "PARENT"); }
  const members = [...memberMap].map(([userId, role]) => ({ userId, role })); const coverage = roleCoverage(members.map((item) => item.role));
  if (!Object.values(coverage).every((count) => count > 0)) return NextResponse.json({ error: "Pilot için admin, öğretmen, öğrenci ve en az bir aktif veli gerekir." }, { status: 400 });
  try {
    const cohort = await prisma.pilotCohort.create({ data: { groupId: group.id, groupNameSnapshot: group.name, createdById: auth.session.userId, requestKey: parsed.data.requestKey, members: { create: members } }, include: { members: true } });
    await recordPanelProductEvent({ name: "pilot_cohort_changed", properties: { action: "CREATED", memberBand: memberBand(members.length), fourRoleCoverage: true, readiness: "WAIT" } }, auth.session.role);
    await logAudit({ actorUserId: auth.session.userId, entityType: "PilotCohort", entityId: cohort.id, action: "pilot.cohort_created", summary: `${group.name} için dört rollü pilot taslağı oluşturuldu`, payload: { groupId: group.id, memberCount: members.length, coverage } });
    return NextResponse.json({ cohort, replayed: false });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") { const duplicate = await prisma.pilotCohort.findUnique({ where: { requestKey: parsed.data.requestKey } }); if (duplicate) return NextResponse.json({ cohort: duplicate, replayed: true }); }
    throw error;
  }
}
