import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { logAudit } from "@/lib/audit";
import { filterNotificationRows, queuePanelNotificationEmails } from "@/lib/panel-notifications";
import { ensurePaidOdOnboarding } from "@/lib/od/onboarding";
import { provisionOdOrder } from "@/lib/od/provisioning";

const schema = z.object({ userId: z.string().min(1) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.orders.link_user", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:orders:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Öğrenci hesabını seçin." }, { status: 400 });
  const { id } = await context.params;
  const student = await prisma.user.findFirst({ where: { id: parsed.data.userId, role: "STUDENT", status: "ACTIVE" }, select: { id: true, studentProfile: { select: { id: true, parents: { select: { parentId: true } } } } } });
  if (!student) return NextResponse.json({ error: "Aktif öğrenci hesabı bulunamadı." }, { status: 404 });
  const order = await prisma.odOrder.findUnique({ where: { id }, select: { id: true, packageName: true, status: true, totalCents: true, userId: true } });
  if (!order) return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  if (order.userId && order.userId !== student.id) return NextResponse.json({ error: "Bu sipariş zaten farklı bir öğrenci hesabına bağlı. Bağlantı değiştirilemez." }, { status: 409 });
  const linked = await prisma.$transaction(async (tx) => {
    const linked = await tx.odOrder.updateMany({ where: { id, OR: [{ userId: null }, { userId: student.id }] }, data: { userId: student.id } });
    if (linked.count !== 1) throw new Error("ORDER_LINK_CONFLICT");
    if (order.status === "PAID") {
      await ensurePaidOdOnboarding(tx, id);
      await tx.odOnboarding.update({ where: { orderId: id }, data: { flowType: "EXISTING_STUDENT" } });
    }
    return true;
  }).catch((error) => {
    if (error instanceof Error && error.message === "ORDER_LINK_CONFLICT") return false;
    throw error;
  });
  if (!linked) return NextResponse.json({ error: "Sipariş aynı anda farklı bir öğrenci hesabına bağlandı. Sayfayı yenileyin." }, { status: 409 });
  if (order.status === "PAID") await provisionOdOrder(id, { studentUserId: student.id });
  if (order.status === "PAID") {
    const body = `${order.packageName} · ${(order.totalCents / 100).toLocaleString("tr-TR")} ₺ ödendi`;
    const rawNotificationRows = [
      { userId: student.id, type: "PAYMENT" as const, title: "Ödeme kaydı eşleştirildi", body, href: "/panel/ogrenci" },
      ...(student.studentProfile?.parents.map((link) => ({ userId: link.parentId, type: "PAYMENT" as const, title: "Ödeme kaydı eşleştirildi", body, href: student.studentProfile ? `/panel/veli/takip?studentId=${student.studentProfile.id}` : "/panel/veli/takip" })) || []),
    ];
    const notificationRows = await filterNotificationRows(rawNotificationRows, "payment");
    if (notificationRows.length) await prisma.notification.createMany({ data: notificationRows });
    await queuePanelNotificationEmails(rawNotificationRows, "payment");
  }
  await logAudit({ actorUserId: auth.session.userId, entityType: "OdOrder", entityId: id, action: "order.user_linked", summary: "Sipariş öğrenci hesabına bağlandı", payload: { userId: student.id } });
  return NextResponse.json({ ok: true });
}
