import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi, apiOk, apiErr } from "@/lib/odk/api";
import { ExamUpdateInput, DEFAULT_EXAM_SETTINGS, type ExamSettings } from "@/lib/odk/schemas";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  const exam = await prisma.odkExam.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { orderIndex: "asc" },
        include: {
          _count: { select: { officialAnswers: true } },
        },
      },
      files: true,
      examAccessTags: { include: { accessTag: true } },
      _count: { select: { attempts: true } },
    },
  });
  if (!exam) return apiErr("Deneme bulunamadı.", 404);
  return apiOk({ exam });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return apiErr("Geçersiz JSON.", 400); }

  const parsed = ExamUpdateInput.safeParse(body);
  if (!parsed.success) {
    return apiErr("Doğrulama hatası.", 422, parsed.error.flatten());
  }
  const data = parsed.data;

  const exam = await prisma.odkExam.findUnique({
    where: { id },
    select: { id: true, status: true, settings: true },
  });
  if (!exam) return apiErr("Deneme bulunamadı.", 404);

  // PUBLISHED denemenin section yapısı kilitli
  if (exam.status === "PUBLISHED" && data.sections) {
    return apiErr("Yayında olan denemenin bölümleri değiştirilemez.", 409);
  }

  const currentSettings = (exam.settings as ExamSettings | null) ?? DEFAULT_EXAM_SETTINGS;
  const mergedSettings = data.settings
    ? { ...currentSettings, ...data.settings }
    : currentSettings;

  const updated = await prisma.$transaction(async (tx) => {
    const updatedExam = await tx.odkExam.update({
      where: { id },
      data: {
        title: data.title ?? undefined,
        slug: data.slug ?? undefined,
        description: data.description === undefined ? undefined : data.description,
        cadenceFamily: data.cadenceFamily ?? undefined,
        classLevel: data.classLevel === undefined ? undefined : data.classLevel,
        durationMinutes: data.durationMinutes ?? undefined,
        startsAt: data.startsAt === undefined ? undefined : data.startsAt,
        endsAt: data.endsAt === undefined ? undefined : data.endsAt,
        settings: mergedSettings,
      },
    });

    if (data.sections) {
      // Mevcut section'ları sil → yenilerini oluştur (admin kontrolünde,
      // DRAFT iken). Cevap anahtarı bağlıysa cascade ile silinir; admin
      // wizard'da uyarı gösterir.
      await tx.odkExamSection.deleteMany({ where: { examId: id } });
      await tx.odkExamSection.createMany({
        data: data.sections.map((s, idx) => ({
          examId: id,
          title: s.title,
          questionCount: s.questionCount,
          orderIndex: idx,
        })),
      });
    }

    return updatedExam;
  });

  return apiOk({ exam: updated });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  const exam = await prisma.odkExam.findUnique({
    where: { id },
    select: { status: true, _count: { select: { attempts: true } } },
  });
  if (!exam) return apiErr("Deneme bulunamadı.", 404);
  if (exam._count.attempts > 0) {
    return apiErr("Bu denemeyi öğrenciler çözmüş; silinemez. Arşivleyin.", 409);
  }

  await prisma.odkExam.delete({ where: { id } });
  return apiOk({ deleted: true });
}
