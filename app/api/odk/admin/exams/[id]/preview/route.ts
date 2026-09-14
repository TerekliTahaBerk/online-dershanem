import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { buildAdminPreview, type AdminPreviewKind } from "@/lib/odk/admin-preview";
import { parseExamSecurityPolicy } from "@/lib/odk/exam-security";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { getOdkExamFamilyCode } from "@/lib/odk/exam-family";

const previewQuerySchema = z.object({ kind: z.enum(["STUDENT_EXAM", "TEACHER_REPORT", "PARENT_REPORT"]).default("STUDENT_EXAM") });

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const routeParams = idParamsSchema.safeParse(await context.params);
  const query = previewQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!routeParams.success || !query.success) return invalidApiInput("Geçersiz önizleme parametreleri.");
  const { id } = routeParams.data;
  const kindParam: AdminPreviewKind = query.data.kind;

  const exam = await prisma.odkExam.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      family: true,
      examFamilyRef: { select: { code: true } },
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
    kind: kindParam,
    examId: exam.id,
    title: exam.title,
    family: getOdkExamFamilyCode(exam),
    durationMinutes: exam.currentVersion.durationMinutes,
    sections: exam.currentVersion.sections,
    security: parseExamSecurityPolicy(exam.currentVersion.settings),
  });

  return NextResponse.json({ preview });
}
