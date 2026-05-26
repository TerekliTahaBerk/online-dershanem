import { NextResponse } from "next/server";
import { setLessonMeetingLinkAction } from "@/app/panel/ogretmen/_actions";
import { jsonErr } from "@/lib/lessons/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let joinUrl = "";
  let hostUrl = "";
  try {
    const body = (await req.json().catch(() => ({}))) as { joinUrl?: string; hostUrl?: string };
    joinUrl = body.joinUrl ?? "";
    hostUrl = body.hostUrl ?? "";
  } catch { /* ignore */ }
  if (!joinUrl) return jsonErr(400, "INVALID_INPUT", "joinUrl zorunlu");
  const fd = new FormData();
  fd.set("joinUrl", joinUrl);
  if (hostUrl) fd.set("hostUrl", hostUrl);
  try {
    await setLessonMeetingLinkAction(id, fd);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return jsonErr(400, "LESSON_MEETLINK_FAILED", msg);
  }
}
