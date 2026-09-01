import { NextResponse } from "next/server";
import type { OdkAttemptEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";
import { RATE_LIMIT_POLICIES } from "@/lib/security/rate-limit-policies";
import { getRateLimitKeyFromUser } from "@/lib/security/rate-limit";
import { examEventBatchSchema } from "@/lib/odk/admin-schemas";
import { assessIntegrity, isHighValueExamEvent } from "@/lib/odk/integrity";

const EVENT_TYPES = new Set<string>([
  "EXAM_STARTED", "QUESTION_OPENED", "QUESTION_CLOSED", "ANSWER_SELECTED", "ANSWER_CHANGED",
  "QUESTION_FLAGGED", "SECTION_CHANGED", "TAB_HIDDEN", "TAB_VISIBLE", "WINDOW_BLUR", "WINDOW_FOCUS",
  "FULLSCREEN_ENTER", "FULLSCREEN_EXIT", "COPY_ATTEMPT", "PASTE_ATTEMPT", "CONTEXT_MENU",
  "NETWORK_OFFLINE", "NETWORK_ONLINE", "EXAM_SUBMITTED", "AUTO_SUBMITTED",
]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "STUDENT"); if (!auth.ok) return auth.response;
  const policy = RATE_LIMIT_POLICIES.odkAnswer;
  const guard = await guardMutation({
    action: "odk.attempt.events",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: getRateLimitKeyFromUser(auth.session.userId, "odk.attempt.events"),
    rateLimit: { max: policy.limit.max * 2, windowMs: policy.limit.windowMs },
  });
  if (!guard.ok) return mutationGuardResponse(guard);

  const parsed = examEventBatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Event batch geçersiz." }, { status: 400 });
  const { id } = await context.params;
  const attempt = await prisma.odkExamAttempt.findFirst({
    where: { id, studentUserId: auth.session.userId },
    select: { id: true, status: true, events: { select: { type: true, metadata: true }, take: 500, orderBy: { sequence: "desc" } } },
  });
  if (!attempt) return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 404 });
  if (!["IN_PROGRESS", "SUBMITTED", "AUTO_SUBMITTED"].includes(attempt.status)) {
    return NextResponse.json({ error: "Oturum event kabul etmiyor." }, { status: 409 });
  }

  const accepted = parsed.data.events.filter((event) => EVENT_TYPES.has(event.type) && isHighValueExamEvent(event.type));
  if (!accepted.length) return NextResponse.json({ accepted: 0, ignored: parsed.data.events.length });

  let inserted = 0;
  for (const event of accepted) {
    try {
      await prisma.odkAttemptEvent.create({
        data: {
          attemptId: id,
          type: event.type as OdkAttemptEventType,
          sequence: event.sequence,
          questionId: event.questionId || null,
          clientOccurredAt: event.clientOccurredAt ? new Date(event.clientOccurredAt) : null,
          metadata: (event.metadata || undefined) as object | undefined,
        },
      });
      inserted += 1;
    } catch {
      // sequence unique → idempotent skip
    }
  }

  const recent = await prisma.odkAttemptEvent.findMany({
    where: { attemptId: id },
    select: { type: true, metadata: true },
    orderBy: { sequence: "asc" },
    take: 1000,
  });
  const assessment = assessIntegrity(recent.map((event) => ({
    type: event.type,
    metadata: (event.metadata || {}) as Record<string, unknown>,
    durationMs: Number((event.metadata as { durationMs?: number } | null)?.durationMs) || 0,
  })));

  await prisma.odkExamAttempt.update({
    where: { id },
    data: {
      lastActivityAt: new Date(),
      integrityLevel: assessment.level,
      integrityReasons: assessment.reasons,
      ...(assessment.level !== "NORMAL" && attempt.status === "IN_PROGRESS" ? {} : {}),
    },
  });

  return NextResponse.json({
    accepted: inserted,
    ignored: parsed.data.events.length - accepted.length,
    integrity: { level: assessment.level, label: assessment.label, reasons: assessment.reasons },
  });
}
