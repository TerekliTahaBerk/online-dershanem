import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminApi, apiOk, apiErr } from "@/lib/odk/api";
import { ExamCreateInput, DEFAULT_EXAM_SETTINGS } from "@/lib/odk/schemas";

export const dynamic = "force-dynamic";

/** GET — admin için deneme listesi (basit, query: q, status, family). */
export async function GET(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const status = url.searchParams.get("status") as
    | "DRAFT" | "PUBLISHED" | "ARCHIVED" | null;
  const family = url.searchParams.get("family") as
    | "TYT" | "AYT" | "LGS" | "KPSS" | "ALES" | null;

  const where: Prisma.OdkExamWhereInput = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status;
  if (family) where.cadenceFamily = family;

  const exams = await prisma.odkExam.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      slug: true,
      cadenceFamily: true,
      classLevel: true,
      status: true,
      durationMinutes: true,
      startsAt: true,
      endsAt: true,
      publishedAt: true,
      createdAt: true,
      _count: { select: { sections: true, attempts: true, files: true } },
    },
  });

  return apiOk({ exams });
}

/** POST — yeni deneme yarat (DRAFT). Sections boşsa hata. */
export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try { body = await req.json(); } catch { return apiErr("Geçersiz JSON.", 400); }

  const parsed = ExamCreateInput.safeParse(body);
  if (!parsed.success) {
    return apiErr("Doğrulama hatası.", 422, parsed.error.flatten());
  }
  const data = parsed.data;

  // Slug çakışması
  const existing = await prisma.odkExam.findUnique({ where: { slug: data.slug } });
  if (existing) {
    return apiErr("Bu slug zaten kullanılıyor.", 409);
  }

  const settings = { ...DEFAULT_EXAM_SETTINGS, ...(data.settings ?? {}) };

  const exam = await prisma.odkExam.create({
    data: {
      title: data.title,
      slug: data.slug,
      description: data.description ?? null,
      cadenceFamily: data.cadenceFamily,
      classLevel: data.classLevel ?? null,
      durationMinutes: data.durationMinutes,
      startsAt: data.startsAt ?? null,
      endsAt: data.endsAt ?? null,
      status: "DRAFT",
      settings,
      createdById: auth.userId,
      sections: {
        create: data.sections.map((s, idx) => ({
          title: s.title,
          questionCount: s.questionCount,
          orderIndex: idx,
        })),
      },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      sections: { select: { id: true, title: true, questionCount: true, orderIndex: true } },
    },
  });

  return apiOk({ exam }, { status: 201 });
}
