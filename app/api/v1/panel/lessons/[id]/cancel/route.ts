import { NextResponse } from "next/server";
import { cancelLessonByTeacherAction } from "@/app/panel/ogretmen/_actions";
import { jsonErr } from "@/lib/lessons/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let reason: string | undefined;
  try {
    const body = (await req.json().catch(() => ({}))) as { reason?: string };
    reason = body.reason;
  } catch { /* ignore */ }
  const fd = new FormData();
  if (reason) fd.set("reason", reason);
  try {
    await cancelLessonByTeacherAction(id, fd);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return jsonErr(400, "LESSON_CANCEL_FAILED", msg);
  }
}
