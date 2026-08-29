import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { logAudit } from "@/lib/audit";
import { filterNotificationRows, queuePanelNotificationEmails } from "@/lib/panel-notifications";

const schema = z.object({ title: z.string().trim().min(2).max(120), startsAt: z.string().datetime(), status: z.enum(["PLANNED", "COMPLETED", "CANCELLED"]), meetingUrl: z.string().url().max(500).optional().or(z.literal("")) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOdRole("ADMIN");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.lessons.update", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:lessons:update:${auth.session.userId}`, rateLimit: { max: 100, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ders bilgilerini kontrol edin." }, { status: 400 });
  const { id } = await context.params;
  const startsAt = new Date(parsed.data.startsAt);
  const existing = await prisma.lesson.findUnique({ where: { id }, include: { group: { include: { enrollments: { where: { endedAt: null }, include: { student: { select: { id: true, userId: true, parents: { select: { parentId: true } } } } } } } } } });
  if (!existing) return NextResponse.json({ error: "Ders bulunamadı." }, { status: 404 });
  await prisma.lesson.update({ where: { id }, data: { title: parsed.data.title, startsAt, endsAt: new Date(startsAt.getTime() + 3600000), status: parsed.data.status, meetingUrl: parsed.data.meetingUrl === undefined ? undefined : parsed.data.meetingUrl || null } });
  const changed = existing.title !== parsed.data.title || existing.startsAt.getTime() !== startsAt.getTime() || existing.status !== parsed.data.status || (parsed.data.meetingUrl !== undefined && (existing.meetingUrl || "") !== parsed.data.meetingUrl);
  if (changed) {
    const state = parsed.data.status === "CANCELLED" ? "iptal edildi" : existing.status === "CANCELLED" ? "yeniden planlandı" : "güncellendi";
    const title = parsed.data.status === "CANCELLED" ? "Ders iptal edildi" : "Ders programı güncellendi";
    const body = `${parsed.data.title} ${state} · ${new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(startsAt)}`;
    const rawNotificationRows = [
      { userId: existing.teacherId, type: "SYSTEM" as const, title, body, href: "/panel/ogretmen/takvim" },
      ...existing.group.enrollments.map((item) => ({ userId: item.student.userId, type: "SYSTEM" as const, title, body, href: "/panel/ogrenci/takvim" })),
      ...existing.group.enrollments.flatMap((item) => item.student.parents.map((link) => ({ userId: link.parentId, type: "SYSTEM" as const, title, body, href: `/panel/veli/takvim?studentId=${item.student.id}` }))),
    ];
    const notificationRows = await filterNotificationRows(rawNotificationRows);
    if (notificationRows.length) await prisma.notification.createMany({ data: notificationRows });
    await queuePanelNotificationEmails(rawNotificationRows);
  }
  await logAudit({ actorUserId: auth.session.userId, entityType: "Lesson", entityId: id, action: "lesson.updated", summary: `${parsed.data.title} dersi güncellendi`, payload: { startsAt: startsAt.toISOString(), status: parsed.data.status } });
  return NextResponse.json({ ok: true });
}
