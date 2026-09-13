import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { assertCoachOrTeacherAccess } from "@/lib/kocum/access-server";

const bodySchema = z.object({
  studentId: z.string().min(1),
  body: z.string().trim().min(2).max(2000),
  visibility: z.enum(["INTERNAL", "STUDENT_VISIBLE", "PARENT_VISIBLE"]).default("INTERNAL"),
});

/** Default visibility INTERNAL — yanlış visibility veri sızıntısı yaratmamalı. */
export async function POST(request: Request) {
  const auth = await requireApiProductRole("OK", "ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;

  const guard = await guardMutation({
    action: "panel.kocum.note_create",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:kocum-note:${auth.session.userId}`,
    rateLimit: { max: 60, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz not." }, { status: 400 });
  }

  const allowed = await assertCoachOrTeacherAccess({
    role: auth.session.role as "ADMIN" | "TEACHER",
    userId: auth.session.userId,
    studentProfileId: parsed.data.studentId,
  });
  if (!allowed) return NextResponse.json({ error: "Bu öğrenci için yetkiniz yok." }, { status: 403 });

  const note = await prisma.coachNote.create({
    data: {
      studentId: parsed.data.studentId,
      authorId: auth.session.userId,
      body: parsed.data.body,
      visibility: parsed.data.visibility,
    },
    select: { id: true, visibility: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, note });
}
