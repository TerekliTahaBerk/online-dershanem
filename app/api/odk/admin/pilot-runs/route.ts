import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { logAudit } from "@/lib/audit";
import { roleCoverage } from "@/lib/pilot-rollout";

const schema = z.object({ name: z.string().trim().min(3).max(80), userIds: z.array(z.string().min(1).max(80)).min(5).max(100), requestKey: z.string().uuid() }).strict();

export async function POST(request: Request) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.pilot.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:pilot:${auth.session.userId}`, rateLimit: { max: 10, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pilot adı ve katılımcı seçimini kontrol edin." }, { status: 400 });
  const userIds = [...new Set(parsed.data.userIds)];
  const replay = await prisma.odkPilotRun.findUnique({ where: { requestKey: parsed.data.requestKey }, include: { members: true } });
  if (replay) return NextResponse.json({ run: replay, replayed: true });
  if (await prisma.odkPilotRun.findFirst({ where: { status: { in: ["DRAFT", "ACTIVE", "PAUSED"] } }, select: { id: true } })) return NextResponse.json({ error: "Önce açık ODK pilot koşusunu tamamlayın veya geri alın." }, { status: 409 });
  const now = new Date();
  const users = await prisma.user.findMany({ where: { id: { in: userIds }, status: "ACTIVE", OR: [{ role: { in: ["ADMIN", "TEACHER"] } }, { productMemberships: { some: { product: "ODK", startsAt: { lte: now }, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } } }] }, select: { id: true, role: true } });
  if (users.length !== userIds.length) return NextResponse.json({ error: "Seçilen hesaplardan biri aktif değil veya ODK erişimi yok." }, { status: 400 });
  const coverage = roleCoverage(users.map((user) => user.role));
  if (coverage.ADMIN < 1 || coverage.TEACHER < 1 || coverage.STUDENT < 2 || coverage.PARENT < 1) return NextResponse.json({ error: "Pilot için admin, öğretmen, en az iki öğrenci ve en az bir veli seçilmelidir." }, { status: 400 });
  try {
    const run = await prisma.odkPilotRun.create({ data: { name: parsed.data.name, createdById: auth.session.userId, requestKey: parsed.data.requestKey, members: { create: users.map((user) => ({ userId: user.id, role: user.role })) } }, include: { members: true } });
    await logAudit({ actorUserId: auth.session.userId, entityType: "OdkPilotRun", entityId: run.id, action: "odk.pilot_created", summary: `${run.name} ODK pilot taslağı oluşturuldu`, payload: { memberCount: users.length, coverage } });
    return NextResponse.json({ run, replayed: false });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") { const duplicate = await prisma.odkPilotRun.findUnique({ where: { requestKey: parsed.data.requestKey }, include: { members: true } }); if (duplicate) return NextResponse.json({ run: duplicate, replayed: true }); }
    throw error;
  }
}
