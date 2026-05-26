/**
 * Sprint 6 — GET /api/v1/panel/lessons/[id]/status
 * Client smart-polling için (öğrenci "Katıl" butonu enable/disable kararı).
 *
 * Cevap: { status, startedAt, endedAt, joinUrl, hostUrl, scheduledAt, duration }
 */
import { NextResponse } from "next/server";
import { resolveLessonContext } from "@/lib/lessons/api-helpers";
import { resolveMeetingLink } from "@/lib/lessons/meeting-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, routeCtx: { params: Promise<{ id: string }> }) {
  const { id } = await routeCtx.params;
  const ctx = await resolveLessonContext(id);
  if (ctx instanceof NextResponse) return ctx;
  const meeting = resolveMeetingLink(ctx.lesson);
  return NextResponse.json({
    id: ctx.lesson.id,
    status: ctx.lesson.status,
    startedAt: ctx.lesson.startedAt?.toISOString() ?? null,
    endedAt: ctx.lesson.endedAt?.toISOString() ?? null,
    scheduledAt: ctx.lesson.scheduledAt.toISOString(),
    duration: ctx.lesson.duration,
    joinUrl: meeting.joinUrl,
    hostUrl: ctx.isOwnerTeacher ? meeting.hostUrl : null,
    meetingProvider: meeting.provider,
  });
}
