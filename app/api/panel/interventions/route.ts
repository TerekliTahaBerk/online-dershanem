import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { parseIstanbulDateInput, istanbulDayEnd, istanbulDayStart } from "@/lib/istanbul-time";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

export const TEACHER_MANUAL_INTERVENTION_VERSION = "teacher-manual-v1";

const MANUAL_REASON_CODES = [
  "ATTENDANCE_PATTERN",
  "OVERDUE_WORK",
  "REPEATED_REVIEW_DIFFICULTY",
  "PLAN_STALLED",
  "TEACHER_OBSERVED",
] as const;

const schema = z
  .object({
    studentId: z.string().trim().min(1).max(64),
    reasonCode: z.enum(MANUAL_REASON_CODES),
    explanation: z.string().trim().min(8).max(500),
    suggestedAction: z.string().trim().min(4).max(300),
    followUpDate: z.string().trim().min(8).max(16),
  })
  .strict();

function manualFingerprint(teacherId: string, studentId: string, nonce: string) {
  return createHash("sha256")
    .update(`${TEACHER_MANUAL_INTERVENTION_VERSION}:${teacherId}:${studentId}:${nonce}`)
    .digest("hex");
}

/**
 * Öğretmen veya admin elle müdahale kaydı oluşturur.
 *
 * Yatay yetki: öğretmen yalnız kendi aktif grubundaki öğrenci için oluşturabilir.
 * Kapsam dışı / bulunmayan öğrenci aynı 404 yanıtını alır.
 */
export async function POST(request: Request) {
  const auth = await requireApiOdRole("ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().interventionInbox) {
    return NextResponse.json({ error: "Müdahale kutusu henüz açık değil." }, { status: 404 });
  }

  const guard = await guardMutation({
    action: "panel.interventions.create",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:intervention-create:${auth.session.userId}`,
    rateLimit: { max: 40, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Müdahale kaydı geçersiz." }, { status: 400 });
  }

  const followUpStart = parseIstanbulDateInput(parsed.data.followUpDate);
  if (!followUpStart) {
    return NextResponse.json({ error: "Takip tarihi geçersiz." }, { status: 400 });
  }
  const now = new Date();
  if (followUpStart.getTime() < istanbulDayStart(now).getTime()) {
    return NextResponse.json({ error: "Takip tarihi bugünden önce olamaz." }, { status: 400 });
  }
  const dueAt = istanbulDayEnd(followUpStart);

  const student = await prisma.studentProfile.findFirst({
    where: {
      id: parsed.data.studentId,
      user: { status: "ACTIVE" },
      ...(auth.session.role === "TEACHER"
        ? {
            enrollments: {
              some: {
                endedAt: null,
                group: { isActive: true, teacherId: auth.session.userId },
              },
            },
          }
        : {}),
    },
    select: { id: true },
  });
  if (!student) {
    return NextResponse.json({ error: "Öğrenci bulunamadı." }, { status: 404 });
  }

  const nonce = randomUUID();
  const created = await prisma.interventionCase.create({
    data: {
      studentId: student.id,
      ruleVersion: TEACHER_MANUAL_INTERVENTION_VERSION,
      reasonCode: parsed.data.reasonCode,
      fingerprint: manualFingerprint(auth.session.userId, student.id, nonce),
      explanation: parsed.data.explanation,
      suggestedAction: parsed.data.suggestedAction,
      evidenceCount: 1,
      windowStart: now,
      windowEnd: dueAt,
      dueAt,
      status: "OPEN",
      ownerId: auth.session.userId,
      firstActionAt: now,
      activities: {
        create: [
          {
            type: "GENERATED",
            actorId: auth.session.userId,
            note: "Öğretmen gözlemiyle oluşturuldu",
          },
          {
            type: "ASSIGNED",
            actorId: auth.session.userId,
          },
        ],
      },
    },
    select: { id: true },
  });

  await recordPanelProductEvent(
    {
      name: "intervention_logged",
      properties: {
        action: "CREATE_MANUAL",
        reasonCode: parsed.data.reasonCode,
        timeToActionMs: 0,
        withinSla: true,
        noteProvided: true,
      },
    },
    auth.session.role,
  );

  return NextResponse.json({ id: created.id });
}
