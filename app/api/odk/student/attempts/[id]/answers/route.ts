import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { decideAnswerRevision } from "@/lib/odk/attempt-domain";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";
import { RATE_LIMIT_POLICIES } from "@/lib/security/rate-limit-policies";
import { getRateLimitKeyFromUser } from "@/lib/security/rate-limit";

const schema = z.object({ questionId: z.string().min(1), selectedOption: z.enum(["A", "B", "C", "D", "E"]).nullable(), isMarked: z.boolean(), revision: z.number().int().min(1) });
class AttemptClosedError extends Error {}
class RevisionConflictError extends Error {}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "STUDENT"); if (!auth.ok) return auth.response;
  const policy = RATE_LIMIT_POLICIES.odkAnswer;
  const guard = await guardMutation({ action: policy.action, requireSameOrigin: true, headers: request.headers, rateLimitKey: getRateLimitKeyFromUser(auth.session.userId, policy.action), rateLimit: policy.limit });
  if (!guard.ok) return mutationGuardResponse(guard);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Cevap kaydı geçersiz." }, { status: 400 });
  const { id } = await context.params;
  const now = new Date();
  const attempt = await prisma.odkExamAttempt.findFirst({
    where: { id, studentUserId: auth.session.userId },
    select: {
      id: true,
      status: true,
      deadlineAt: true,
      version: {
        select: {
          sections: {
            select: {
              questions: {
                where: { id: parsed.data.questionId, isActive: true },
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });
  if (!attempt) return NextResponse.json({ error: "Sınav oturumu bulunamadı." }, { status: 404 });
  if (attempt.status !== "IN_PROGRESS" || now >= attempt.deadlineAt) {
    if (attempt.status === "IN_PROGRESS") await prisma.odkExamAttempt.update({ where: { id }, data: { status: "AUTO_SUBMITTED", submittedAt: now } });
    return NextResponse.json({ error: "Sınav süresi sona erdi.", code: "ATTEMPT_CLOSED" }, { status: 409 });
  }
  if (!attempt.version.sections.some((section) => section.questions.length)) return NextResponse.json({ error: "Soru bu sınav sürümünde bulunmuyor." }, { status: 400 });
  const existing = await prisma.odkAttemptAnswer.findUnique({ where: { attemptId_questionId: { attemptId: id, questionId: parsed.data.questionId } } });
  const revisionDecision = decideAnswerRevision(existing, parsed.data);
  if (revisionDecision === "IDEMPOTENT") return NextResponse.json({ answer: existing, idempotent: true });
  if (revisionDecision === "CONFLICT") return NextResponse.json({ error: "Cevap revizyonu sıralı değil.", code: "REVISION_CONFLICT", answer: existing }, { status: 409 });
  try {
    const answer = await prisma.$transaction(async (tx) => {
      const active = await tx.odkExamAttempt.updateMany({ where: { id, studentUserId: auth.session.userId, status: "IN_PROGRESS", deadlineAt: { gt: now } }, data: { lastActivityAt: now } });
      if (!active.count) throw new AttemptClosedError();
      if (!existing) {
        return tx.odkAttemptAnswer.create({
          data: {
            attemptId: id,
            questionId: parsed.data.questionId,
            selectedOption: parsed.data.selectedOption,
            isMarked: parsed.data.isMarked,
            revision: 1,
            changedCount: parsed.data.selectedOption ? 1 : 0,
            answeredAt: parsed.data.selectedOption ? now : null,
            firstAnsweredAt: parsed.data.selectedOption ? now : null,
            lastChangedAt: parsed.data.selectedOption ? now : null,
          },
        });
      }
      const optionChanged = existing.selectedOption !== parsed.data.selectedOption;
      const changed = await tx.odkAttemptAnswer.updateMany({
        where: { attemptId: id, questionId: parsed.data.questionId, revision: existing.revision },
        data: {
          selectedOption: parsed.data.selectedOption,
          isMarked: parsed.data.isMarked,
          revision: parsed.data.revision,
          answeredAt: parsed.data.selectedOption ? now : existing.answeredAt,
          firstAnsweredAt: existing.firstAnsweredAt || (parsed.data.selectedOption ? now : null),
          lastChangedAt: optionChanged ? now : existing.lastChangedAt,
          changedCount: optionChanged ? existing.changedCount + 1 : existing.changedCount,
        },
      });
      if (!changed.count) throw new RevisionConflictError();
      return tx.odkAttemptAnswer.findUniqueOrThrow({ where: { attemptId_questionId: { attemptId: id, questionId: parsed.data.questionId } } });
    });
    return NextResponse.json({ answer });
  } catch (error) {
    if (error instanceof AttemptClosedError) return NextResponse.json({ error: "Sınav süresi sona erdi.", code: "ATTEMPT_CLOSED" }, { status: 409 });
    if (error instanceof RevisionConflictError || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      const latest = await prisma.odkAttemptAnswer.findUnique({ where: { attemptId_questionId: { attemptId: id, questionId: parsed.data.questionId } } });
      return NextResponse.json({ error: "Daha güncel bir cevap zaten kaydedildi.", code: "REVISION_CONFLICT", answer: latest }, { status: 409 });
    }
    throw error;
  }
}
