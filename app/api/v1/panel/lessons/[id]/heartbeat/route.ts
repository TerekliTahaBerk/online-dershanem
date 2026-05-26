/**
 * Sprint 6 — POST /api/v1/panel/lessons/[id]/heartbeat
 * 30sn-60sn aralıkla client tarafından gönderilir. Durum LIVE değilse yutar.
 * Her heartbeat tek satır → ileride volume problem olursa rate-limit eklenir.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveLessonContext, extractClientMetadata } from "@/lib/lessons/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, routeCtx: { params: Promise<{ id: string }> }) {
  const { id } = await routeCtx.params;
  const ctx = await resolveLessonContext(id);
  if (ctx instanceof NextResponse) return ctx;
  if (ctx.lesson.status !== "LIVE") {
    return NextResponse.json({ ok: true, ignored: true, reason: "NOT_LIVE" });
  }
  const { ip, ua } = extractClientMetadata(req);
  await prisma.lessonJoinEvent.create({
    data: {
      lessonId: ctx.lesson.id,
      sessionGroupId: ctx.lesson.sessionGroupId,
      studentId: ctx.isOwnStudent ? ctx.studentId : null,
      userId: ctx.userId,
      kind: "HEARTBEAT",
      ip,
      ua,
    },
  });
  return NextResponse.json({ ok: true });
}
