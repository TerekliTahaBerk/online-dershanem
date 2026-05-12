import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi, apiOk, apiErr } from "@/lib/odk/api";
import { ExamAccessTagsInput } from "@/lib/odk/schemas";

export const dynamic = "force-dynamic";

/**
 * PUT  → exam ile bir tag setini eşleştir (replace).
 * Body: { tagIds: string[] }
 */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return apiErr("Geçersiz JSON.", 400); }
  const parsed = ExamAccessTagsInput.safeParse(body);
  if (!parsed.success) return apiErr("Doğrulama hatası.", 422, parsed.error.flatten());
  const { tagIds } = parsed.data;

  const exam = await prisma.odkExam.findUnique({ where: { id }, select: { id: true } });
  if (!exam) return apiErr("Deneme bulunamadı.", 404);

  // Sadece ODK service tagları
  const validTags = await prisma.odkAccessTag.findMany({
    where: { id: { in: tagIds }, isActive: true, service: "ODK" },
    select: { id: true },
  });
  const validIds = new Set(validTags.map((t) => t.id));
  const invalid = tagIds.filter((t) => !validIds.has(t));
  if (invalid.length > 0) {
    return apiErr(`Geçersiz veya aktif olmayan ODK tag(lar): ${invalid.join(", ")}`, 422);
  }

  await prisma.$transaction([
    prisma.odkExamAccessTag.deleteMany({ where: { examId: id } }),
    prisma.odkExamAccessTag.createMany({
      data: validTags.map((t) => ({ examId: id, accessTagId: t.id })),
    }),
  ]);

  return apiOk({ tagIds: Array.from(validIds) });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const rows = await prisma.odkExamAccessTag.findMany({
    where: { examId: id },
    include: { accessTag: true },
  });
  return apiOk({ tags: rows.map((r) => r.accessTag) });
}
