import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";

const schema = z.object({ userId: z.string().min(1) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("ADMIN");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.orders.link_user", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:orders:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Öğrenci hesabını seçin." }, { status: 400 });
  const { id } = await context.params;
  const student = await prisma.user.findFirst({ where: { id: parsed.data.userId, role: "STUDENT", status: "ACTIVE" }, select: { id: true } });
  if (!student) return NextResponse.json({ error: "Aktif öğrenci hesabı bulunamadı." }, { status: 404 });
  const result = await prisma.odOrder.updateMany({ where: { id }, data: { userId: student.id } });
  if (!result.count) return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
