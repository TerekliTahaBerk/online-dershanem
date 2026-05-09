import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";

const onboardingSchema = z.object({
  classLevel: z.string().min(1).max(40),
  examType: z.string().min(1).max(40),
  city: z.string().max(80).optional().nullable(),
  schoolName: z.string().max(120).optional().nullable(),
  targetSchool: z.string().max(120).optional().nullable(),
  weeklyStudyHours: z.string().max(40).optional().nullable(),
  needType: z.string().max(80).optional().nullable(),
  source: z.string().max(60).optional().nullable(),
});

export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkilendirme gerekli." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz alanlar." }, { status: 400 });
  }

  const data = parsed.data;
  const userId = session.user.id;

  try {
    // Find linked student record by userId
    const student = await prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });

    const studentUpdate = {
      classLevel: data.classLevel,
      examType: data.examType,
      city: data.city ?? null,
      schoolName: data.schoolName ?? null,
      targetSchool: data.targetSchool ?? null,
      weeklyStudyHours: data.weeklyStudyHours ?? null,
      needType: data.needType ?? null,
      ...(data.source ? { source: data.source } : {}),
    };

    if (student) {
      await prisma.student.update({
        where: { id: student.id },
        data: studentUpdate,
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { onboardingCompletedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[onboarding] failed", error);
    return NextResponse.json({ error: "Kayıt güncellenemedi." }, { status: 500 });
  }
}
