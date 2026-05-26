/**
 * Sprint 6 — POST /api/v1/panel/lessons/[id]/leave
 * Tarayıcı sekmesi kapatılırken navigator.sendBeacon ile çağrılır (best-effort).
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
  const { ip, ua } = extractClientMetadata(req);
  await prisma.lessonJoinEvent.create({
    data: {
      lessonId: ctx.lesson.id,
      sessionGroupId: ctx.lesson.sessionGroupId,
      studentId: ctx.isOwnStudent ? ctx.studentId : null,
      userId: ctx.userId,
      kind: "LEAVE",
      ip,
      ua,
    },
  });
  return NextResponse.json({ ok: true });
}
