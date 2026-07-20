import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { createSeriesSchema } from "@/lib/odk/admin-schemas";

export async function POST(request: Request) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.series.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:series:${auth.session.userId}`, rateLimit: { max: 30, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = createSeriesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Seri bilgilerini kontrol edin." }, { status: 400 });
  if (await prisma.odkExamSeries.findUnique({ where: { slug: parsed.data.slug }, select: { id: true } })) return NextResponse.json({ error: "Bu seri adresi kullanımda." }, { status: 409 });
  const series = await prisma.odkExamSeries.create({ data: { ...parsed.data, classLevel: parsed.data.classLevel || null, createdById: auth.session.userId } });
  await logAudit({ actorUserId: auth.session.userId, entityType: "OdkExamSeries", entityId: series.id, action: "odk.series_created", summary: `${series.family} matematik serisi oluşturuldu` });
  return NextResponse.json({ series: { id: series.id, title: series.title, family: series.family } }, { status: 201 });
}
