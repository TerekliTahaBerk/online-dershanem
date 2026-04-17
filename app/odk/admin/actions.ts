"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelAccess } from "@/lib/panel-access";

async function requireOdkAdmin() {
  const session = await getServerAuthSession();
  const access = getPanelAccess(session?.user);
  if (!session || !access.hasAdminPanel) throw new Error("Yetkisiz erişim");
  return session;
}

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[çÇ]/g, "c")
    .replace(/[ğĞ]/g, "g")
    .replace(/[ıİ]/g, "i")
    .replace(/[öÖ]/g, "o")
    .replace(/[şŞ]/g, "s")
    .replace(/[üÜ]/g, "u")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .concat("-", Date.now().toString(36));
}

// ── Exams ─────────────────────────────────────────────────────────────────────

export type SectionInput = {
  title: string;
  questionCount: number;
};

export async function createExam(data: {
  title: string;
  cadenceFamily: string;
  durationMinutes: number;
  startsAt?: string;
  endsAt?: string;
  examSeriesId?: string;
  sections: SectionInput[];
}) {
  const session = await requireOdkAdmin();

  const exam = await prisma.odkExam.create({
    data: {
      title: data.title,
      slug: toSlug(data.title),
      cadenceFamily: data.cadenceFamily as never,
      durationMinutes: data.durationMinutes,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      examSeriesId: data.examSeriesId || null,
      createdById: session.user.id,
      sections: {
        create: data.sections.map((s, i) => ({
          title: s.title,
          questionCount: s.questionCount,
          orderIndex: i,
        })),
      },
    },
  });

  revalidatePath("/odk/admin/sinavlar");
  redirect(`/odk/admin/sinavlar/${exam.id}`);
}

export async function updateExamMeetLink(examId: string, googleMeetLink: string | null) {
  await requireOdkAdmin();
  await prisma.odkExam.update({
    where: { id: examId },
    data: { googleMeetLink: googleMeetLink || null },
  });
  revalidatePath(`/odk/admin/sinavlar/${examId}`);
}

export async function updateExamStatus(examId: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
  await requireOdkAdmin();
  await prisma.odkExam.update({ where: { id: examId }, data: { status } });
  revalidatePath(`/odk/admin/sinavlar/${examId}`);
  revalidatePath("/odk/admin/sinavlar");
}

export async function updateExamFiles(examId: string, data: {
  bookletUrl?: string;
  answerKeyUrl?: string;
}) {
  await requireOdkAdmin();

  if (data.bookletUrl !== undefined) {
    await prisma.odkExamFile.upsert({
      where: { examId_fileType: { examId, fileType: "BOOKLET_PDF" } },
      create: { examId, fileType: "BOOKLET_PDF", publicUrl: data.bookletUrl, originalFileName: "kitapcik.pdf" },
      update: { publicUrl: data.bookletUrl },
    });
  }

  if (data.answerKeyUrl !== undefined) {
    await prisma.odkExamFile.upsert({
      where: { examId_fileType: { examId, fileType: "ANSWER_KEY_PDF" } },
      create: { examId, fileType: "ANSWER_KEY_PDF", publicUrl: data.answerKeyUrl, originalFileName: "cevap-anahtari.pdf" },
      update: { publicUrl: data.answerKeyUrl },
    });
  }

  revalidatePath(`/odk/admin/sinavlar/${examId}`);
}

export async function saveOfficialAnswers(sectionId: string, answers: Record<number, string>) {
  await requireOdkAdmin();

  const section = await prisma.odkExamSection.findUnique({ where: { id: sectionId } });
  if (!section) throw new Error("Bölüm bulunamadı");

  const upserts = Object.entries(answers).map(([num, option]) =>
    prisma.odkExamOfficialAnswer.upsert({
      where: { sectionId_questionNumber: { sectionId, questionNumber: Number(num) } },
      create: { examId: section.examId, sectionId, questionNumber: Number(num), correctOption: option },
      update: { correctOption: option },
    })
  );

  await prisma.$transaction(upserts);
  revalidatePath(`/odk/admin/sinavlar/${section.examId}`);
}

export async function addExamAccessTag(examId: string, accessTagId: string) {
  await requireOdkAdmin();
  await prisma.odkExamAccessTag.upsert({
    where: { examId_accessTagId: { examId, accessTagId } },
    create: { examId, accessTagId },
    update: {},
  });
  revalidatePath(`/odk/admin/sinavlar/${examId}`);
}

export async function removeExamAccessTag(examId: string, accessTagId: string) {
  await requireOdkAdmin();
  await prisma.odkExamAccessTag.delete({
    where: { examId_accessTagId: { examId, accessTagId } },
  });
  revalidatePath(`/odk/admin/sinavlar/${examId}`);
}

// ── Packages ──────────────────────────────────────────────────────────────────

export async function createPackage(data: {
  title: string;
  description?: string;
  priceCents: number;
  durationDays?: number;
}) {
  await requireOdkAdmin();
  await prisma.odkPackage.create({
    data: {
      title: data.title,
      slug: toSlug(data.title),
      description: data.description || null,
      priceCents: data.priceCents,
      durationDays: data.durationDays || null,
    },
  });
  revalidatePath("/odk/admin/paketler");
}

export async function togglePackageStatus(packageId: string, isActive: boolean) {
  await requireOdkAdmin();
  await prisma.odkPackage.update({ where: { id: packageId }, data: { isActive } });
  revalidatePath("/odk/admin/paketler");
}

// ── Access Tags ───────────────────────────────────────────────────────────────

export async function createAccessTag(data: { key: string; title: string; description?: string }) {
  await requireOdkAdmin();
  await prisma.odkAccessTag.create({
    data: { key: data.key, title: data.title, description: data.description || null },
  });
  revalidatePath("/odk/admin/etiketler");
}

export async function grantUserAccessTag(userId: string, accessTagId: string) {
  await requireOdkAdmin();
  await prisma.odkUserAccessTag.upsert({
    where: { userId_accessTagId: { userId, accessTagId } },
    create: { userId, accessTagId, source: "MANUAL" },
    update: { revokedAt: null },
  });
  revalidatePath("/odk/admin/ogrenciler");
}

export async function revokeUserAccessTag(userId: string, accessTagId: string) {
  await requireOdkAdmin();
  await prisma.odkUserAccessTag.update({
    where: { userId_accessTagId: { userId, accessTagId } },
    data: { revokedAt: new Date() },
  });
  revalidatePath("/odk/admin/ogrenciler");
}
