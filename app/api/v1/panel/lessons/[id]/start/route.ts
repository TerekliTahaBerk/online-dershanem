import { NextResponse } from "next/server";
import { startLessonAction } from "@/app/panel/ogretmen/_actions";
import { jsonErr } from "@/lib/lessons/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    await startLessonAction(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Hata";
    return jsonErr(400, "LESSON_START_FAILED", msg);
  }
}
