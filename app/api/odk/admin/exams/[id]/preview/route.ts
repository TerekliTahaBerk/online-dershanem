import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { buildAdminPreview, type AdminPreviewKind } from "@/lib/odk/admin-preview";
import { parseExamSecurityPolicy } from "@/lib/odk/exam-security";

const kinds = new Set<AdminPreviewKind>(["STUDENT_EXAM", "TEACHER_REPORT", "PARENT_REPORT"]);

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const kindParam = new URL(request.url).searchParams.get("kind") || "STUDENT_EXAM";
  if (!kinds.has(kindParam as AdminPreviewKind)) {
    return NextResponse.json({ error: "Geçersiz önizleme türü." }, { status: 400 });
  }

  const exam = await prisma.odkExam.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      family: true,
      currentVersion: {
        select: {
          durationMinutes: true,
          settings: true,
          sections: { orderBy: { position: "asc" }, select: { code: true, title: true, questionCount: true } },
        },
      },
    },
  });
  if (!exam?.currentVersion) return NextResponse.json({ error: "Deneme bulunamadı." }, { status: 404 });

  const preview = buildAdminPreview({
    kind: kindParam as AdminPreviewKind,
    examId: exam.id,
    title: exam.title,
    family: exam.family,
    durationMinutes: exam.currentVersion.durationMinutes,
    sections: exam.currentVersion.sections,
    security: parseExamSecurityPolicy(exam.currentVersion.settings),
  });

  return NextResponse.json({ preview });
}
