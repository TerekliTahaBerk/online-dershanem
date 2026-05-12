import { NextResponse } from "next/server";
import type { SubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, requireMobileUser } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: SubmissionStatus[] = ["PENDING", "SUBMITTED", "GRADED", "LATE", "MISSED"];

export async function GET(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;

  const student = await prisma.student.findFirst({
    where: { userId: auth.userId },
    select: { id: true },
  });
  if (!student) return jsonError(404, "STUDENT_NOT_FOUND", "Öğrenci kaydı bulunamadı.");

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status") as SubmissionStatus | null;
  const status = statusParam && VALID.includes(statusParam) ? statusParam : null;

  const submissions = await prisma.assignmentSubmission.findMany({
    where: {
      studentId: student.id,
      ...(status ? { status } : {}),
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      assignment: {
        select: {
          id: true,
          title: true,
          subject: true,
          dueAt: true,
          maxScore: true,
          teacher: { select: { id: true, fullName: true } },
        },
      },
    },
  });

  return NextResponse.json({
    data: submissions.map((s) => ({
      id: s.assignment.id,
      title: s.assignment.title,
      subject: s.assignment.subject,
      dueAt: s.assignment.dueAt?.toISOString() ?? null,
      status: s.status,
      teacher: s.assignment.teacher,
      score: s.score,
      maxScore: s.assignment.maxScore,
    })),
  });
}
