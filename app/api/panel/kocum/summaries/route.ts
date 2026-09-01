import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { assertCoachOrTeacherAccess } from "@/lib/kocum/access-server";
import { appendTimelineEvent } from "@/lib/kocum/server";
import { istanbulWeekStart } from "@/lib/istanbul-time";

const bodySchema = z.object({
  studentId: z.string().min(1),
  weekStart: z.string().datetime().optional(),
  planCompletionPct: z.number().int().min(0).max(100).optional().nullable(),
  strengths: z.string().trim().max(500).optional().nullable(),
  focusAreas: z.string().trim().max(500).optional().nullable(),
  nextWeekFocus: z.string().trim().max(500).optional().nullable(),
  studentVisibleText: z.string().trim().max(1000).optional().nullable(),
  parentVisibleText: z.string().trim().max(1000).optional().nullable(),
  publish: z.boolean().default(false),
});

export async function POST(request: Request) {
  const auth = await requireApiProductRole("OK", "ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;

  const guard = await guardMutation({
    action: "panel.kocum.summary_upsert",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:kocum-summary:${auth.session.userId}`,
    rateLimit: { max: 40, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz özet." }, { status: 400 });
  }

  const allowed = await assertCoachOrTeacherAccess({
    role: auth.session.role as "ADMIN" | "TEACHER",
    userId: auth.session.userId,
    studentProfileId: parsed.data.studentId,
  });
  if (!allowed) return NextResponse.json({ error: "Bu öğrenci için yetkiniz yok." }, { status: 403 });

  const weekStart = istanbulWeekStart(
    parsed.data.weekStart ? new Date(parsed.data.weekStart) : new Date(),
  );

  const summary = await prisma.weeklyCoachSummary.upsert({
    where: {
      studentId_weekStart: { studentId: parsed.data.studentId, weekStart },
    },
    create: {
      studentId: parsed.data.studentId,
      weekStart,
      planCompletionPct: parsed.data.planCompletionPct ?? null,
      strengths: parsed.data.strengths ?? null,
      focusAreas: parsed.data.focusAreas ?? null,
      nextWeekFocus: parsed.data.nextWeekFocus ?? null,
      studentVisibleText: parsed.data.studentVisibleText ?? null,
      parentVisibleText: parsed.data.parentVisibleText ?? null,
      status: parsed.data.publish ? "PUBLISHED" : "DRAFT",
      publishedAt: parsed.data.publish ? new Date() : null,
      publishedById: parsed.data.publish ? auth.session.userId : null,
    },
    update: {
      planCompletionPct: parsed.data.planCompletionPct ?? null,
      strengths: parsed.data.strengths ?? null,
      focusAreas: parsed.data.focusAreas ?? null,
      nextWeekFocus: parsed.data.nextWeekFocus ?? null,
      studentVisibleText: parsed.data.studentVisibleText ?? null,
      parentVisibleText: parsed.data.parentVisibleText ?? null,
      ...(parsed.data.publish
        ? {
            status: "PUBLISHED" as const,
            publishedAt: new Date(),
            publishedById: auth.session.userId,
          }
        : {}),
    },
  });

  if (parsed.data.publish) {
    await appendTimelineEvent({
      studentId: parsed.data.studentId,
      kind: "COACH_SUMMARY",
      title: "Haftalık koç özeti yayınlandı",
      summary: parsed.data.parentVisibleText || parsed.data.studentVisibleText || undefined,
      visibility: "PARENT",
    });
  }

  return NextResponse.json({ ok: true, summaryId: summary.id, status: summary.status });
}
