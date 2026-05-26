/**
 * Sprint 6 — POST /api/v1/panel/lessons/[id]/join
 *
 * Bir kullanıcı (öğrenci veya öğretmen) join event'i kaydeder. Eğer ders
 * SCHEDULED ise ve giren kişi öğretmense, otomatik LIVE'a geçirir (öğretmen
 * UI'da hiç "Başlat" tıklamadan bağlanmış olabilir).
 *
 * Cevap: { ok, joinUrl, hostUrl?, status }
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveLessonContext, extractClientMetadata, jsonErr } from "@/lib/lessons/api-helpers";
import { resolveMeetingLink } from "@/lib/lessons/meeting-provider";
import { canStart } from "@/lib/lessons/lifecycle";
import { startLessonAction } from "@/app/panel/ogretmen/_actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, routeCtx: { params: Promise<{ id: string }> }) {
  const { id } = await routeCtx.params;
  const ctx = await resolveLessonContext(id);
  if (ctx instanceof NextResponse) return ctx;

  const meeting = resolveMeetingLink(ctx.lesson);
  if (!meeting.joinUrl) return jsonErr(409, "NO_MEETING_LINK", "Ders bağlantısı tanımlı değil.");

  // Öğretmen ilk kez giriyor + ders SCHEDULED ise → otomatik LIVE.
  if (ctx.isOwnerTeacher && ctx.lesson.status === "SCHEDULED") {
    const guard = canStart({
      status: ctx.lesson.status as "SCHEDULED",
      scheduledAt: ctx.lesson.scheduledAt,
      duration: ctx.lesson.duration,
      meetingJoinUrl: meeting.joinUrl,
    });
    if (guard.ok) {
      await startLessonAction(ctx.lesson.id).catch(() => null);
    }
  }

  // Öğrenci ya da veli SCHEDULED bir derse "Katıl" diyemez (sadece LIVE/ENDED grace).
  if (!ctx.isOwnerTeacher && ctx.lesson.status === "SCHEDULED") {
    return jsonErr(409, "NOT_LIVE", "Ders henüz başlamadı.");
  }
  if (
    ctx.lesson.status === "CANCELLED" ||
    ctx.lesson.status === "MISSED" ||
    ctx.lesson.status === "ENDED" ||
    ctx.lesson.status === "COMPLETED"
  ) {
    return jsonErr(409, "NOT_JOINABLE", "Bu ders artık bağlanılabilir değil.");
  }

  const { ip, ua } = extractClientMetadata(req);
  await prisma.lessonJoinEvent.create({
    data: {
      lessonId: ctx.lesson.id,
      sessionGroupId: ctx.lesson.sessionGroupId,
      studentId: ctx.isOwnStudent ? ctx.studentId : null,
      userId: ctx.userId,
      kind: "JOIN",
      ip,
      ua,
    },
  });

  return NextResponse.json({
    ok: true,
    status: ctx.lesson.status,
    joinUrl: meeting.joinUrl,
    hostUrl: ctx.isOwnerTeacher ? meeting.hostUrl : null,
  });
}
