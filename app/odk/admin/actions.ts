"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelAccess } from "@/lib/panel-access";
import { sendOdkResultsReleased, sendOdkAccessGranted } from "@/lib/email";
import {
  requireOdkExamAnswerKeyReleasedAtColumn,
  requireOdkExamGoogleMeetLinkColumn,
  requireOdkExamResultsReleasedAtColumn,
} from "@/lib/odk-exam-schema";

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

export type ExamSectionUpdateInput = SectionInput & {
  id?: string;
};

export async function updateExamDetails(
  examId: string,
  data: {
    title: string;
    cadenceFamily: string;
    durationMinutes: number;
    startsAt?: string;
    endsAt?: string;
    sections: ExamSectionUpdateInput[];
  },
) {
  await requireOdkAdmin();

  const title = data.title.trim();
  if (!title) throw new Error("Sınav başlığı zorunludur.");
  if (!Number.isInteger(data.durationMinutes) || data.durationMinutes < 10 || data.durationMinutes > 360) {
    throw new Error("Süre 10 ile 360 dakika arasında olmalıdır.");
  }
  if (data.sections.length === 0) throw new Error("En az bir bölüm ekleyin.");

  const sections = data.sections.map((section) => ({
    id: section.id,
    title: section.title.trim(),
    questionCount: Number(section.questionCount),
  }));

  if (sections.some((section) => !section.title || !Number.isInteger(section.questionCount) || section.questionCount < 1 || section.questionCount > 200)) {
    throw new Error("Tüm bölümlerin başlığı ve soru sayısı geçerli olmalıdır.");
  }

  const startsAt = data.startsAt ? new Date(data.startsAt) : null;
  const endsAt = data.endsAt ? new Date(data.endsAt) : null;
  if (startsAt && Number.isNaN(startsAt.getTime())) throw new Error("Başlangıç tarihi geçersiz.");
  if (endsAt && Number.isNaN(endsAt.getTime())) throw new Error("Bitiş tarihi geçersiz.");
  if (startsAt && endsAt && endsAt <= startsAt) {
    throw new Error("Bitiş tarihi başlangıç tarihinden sonra olmalıdır.");
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.odkExam.findUnique({
      where: { id: examId },
      select: {
        sections: {
          select: {
            id: true,
            questionCount: true,
            _count: { select: { officialAnswers: true, opticalAnswers: true } },
          },
        },
        _count: { select: { attempts: true } },
      },
    });
    if (!existing) throw new Error("Sınav bulunamadı.");

    const existingById = new Map(existing.sections.map((section) => [section.id, section]));
    const submittedIds = new Set(sections.map((section) => section.id).filter(Boolean));
    const removedSections = existing.sections.filter((section) => !submittedIds.has(section.id));
    const hasAttempts = existing._count.attempts > 0;

    if (hasAttempts && removedSections.length > 0) {
      throw new Error("Katılım başlamış sınavlarda bölüm silinemez.");
    }

    for (const section of sections) {
      if (!section.id) continue;
      const current = existingById.get(section.id);
      if (!current) throw new Error("Güncellenecek bölüm bulunamadı.");
      if (hasAttempts && section.questionCount < current.questionCount) {
        throw new Error("Katılım başlamış sınavlarda soru sayısı azaltılamaz.");
      }
    }

    await tx.odkExam.update({
      where: { id: examId },
      data: {
        title,
        cadenceFamily: data.cadenceFamily as never,
        durationMinutes: data.durationMinutes,
        startsAt,
        endsAt,
      },
    });

    for (const section of existing.sections) {
      await tx.odkExamSection.update({
        where: { id: section.id },
        data: { orderIndex: -1000 - existing.sections.findIndex((item) => item.id === section.id) },
      });
    }

    for (const removed of removedSections) {
      await tx.odkExamSection.delete({ where: { id: removed.id } });
    }

    for (const [orderIndex, section] of sections.entries()) {
      if (section.id) {
        await tx.odkExamSection.update({
          where: { id: section.id },
          data: {
            title: section.title,
            questionCount: section.questionCount,
            orderIndex,
          },
        });
        await tx.odkExamOfficialAnswer.deleteMany({
          where: { sectionId: section.id, questionNumber: { gt: section.questionCount } },
        });
      } else {
        await tx.odkExamSection.create({
          data: {
            examId,
            title: section.title,
            questionCount: section.questionCount,
            orderIndex,
          },
        });
      }
    }
  });

  revalidatePath(`/odk/admin/sinavlar/${examId}`);
  revalidatePath("/odk/admin/sinavlar");
}

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
    select: { id: true },
  });

  revalidatePath("/odk/admin/sinavlar");
  redirect(`/odk/admin/sinavlar/${exam.id}`);
}

export async function releaseExamResults(examId: string) {
  await requireOdkAdmin();
  await requireOdkExamResultsReleasedAtColumn();

  const exam = await prisma.odkExam.update({
    where: { id: examId },
    data: { resultsReleasedAt: new Date() },
    select: { id: true, title: true, resultsReleasedAt: true },
  });

  // Notify all students who completed the exam
  const attempts = await prisma.odkExamAttempt.findMany({
    where: { examId, status: "SUBMITTED" },
    select: {
      score: true,
      user: { select: { email: true, name: true } },
    },
  });

  await Promise.allSettled(
    attempts.map((a) =>
      sendOdkResultsReleased({
        to: a.user.email,
        name: a.user.name ?? a.user.email,
        examTitle: exam.title,
        score: a.score != null ? Number(a.score) : null,
        examUrl: `/odk/panel/sinavlar/${examId}`,
      }),
    ),
  );

  revalidatePath(`/odk/admin/sinavlar/${examId}`);
  revalidatePath(`/odk/panel/sinavlar/${examId}`);
}

export async function releaseAnswerKey(examId: string) {
  await requireOdkAdmin();
  await requireOdkExamAnswerKeyReleasedAtColumn();
  await prisma.odkExam.update({
    where: { id: examId },
    data: { answerKeyReleasedAt: new Date() },
  });
  revalidatePath(`/odk/admin/sinavlar/${examId}`);
  revalidatePath(`/odk/panel/sinavlar/${examId}`);
}

export async function updateExamMeetLink(examId: string, googleMeetLink: string | null) {
  await requireOdkAdmin();
  await requireOdkExamGoogleMeetLinkColumn();
  await prisma.odkExam.update({
    where: { id: examId },
    data: { googleMeetLink: googleMeetLink || null },
  });
  revalidatePath(`/odk/admin/sinavlar/${examId}`);
}

export async function deleteExam(examId: string) {
  await requireOdkAdmin();
  await prisma.odkExam.delete({ where: { id: examId } });
  revalidatePath("/odk/admin/sinavlar");
  redirect("/odk/admin/sinavlar");
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

  const validOptions = new Set(["A", "B", "C", "D", "E"]);
  const operations = Object.entries(answers).map(([num, option]) => {
    const questionNumber = Number(num);
    if (!Number.isInteger(questionNumber) || questionNumber < 1 || questionNumber > section.questionCount) {
      throw new Error("Geçersiz soru numarası.");
    }
    if (!option) {
      return prisma.odkExamOfficialAnswer.deleteMany({
        where: { sectionId, questionNumber },
      });
    }
    if (!validOptions.has(option)) throw new Error("Cevaplar yalnızca A, B, C, D veya E olabilir.");
    return prisma.odkExamOfficialAnswer.upsert({
      where: { sectionId_questionNumber: { sectionId, questionNumber: Number(num) } },
      create: { examId: section.examId, sectionId, questionNumber: Number(num), correctOption: option },
      update: { correctOption: option },
    });
  });

  await prisma.$transaction(operations);
  revalidatePath(`/odk/admin/sinavlar/${section.examId}`);
}

type OutcomesJson = { konu: string; kazanim: string; altKazanim?: string };

export async function importAnswerKeyJson(
  examId: string,
  json: Record<string, Record<string, string>>,
) {
  await requireOdkAdmin();

  const sections = await prisma.odkExamSection.findMany({
    where: { examId },
    select: { id: true, title: true },
  });

  const sectionMap = new Map(sections.map((s) => [s.title, s.id]));

  const validOptions = new Set(["A", "B", "C", "D", "E"]);
  const operations = Object.entries(json).flatMap(([sectionTitle, answers]) => {
    const sectionId = sectionMap.get(sectionTitle);
    if (!sectionId) return [];
    return Object.entries(answers).map(([num, option]) => {
      const questionNumber = Number(num);
      if (!Number.isInteger(questionNumber) || questionNumber < 1) throw new Error("Geçersiz soru numarası.");
      if (!option) {
        return prisma.odkExamOfficialAnswer.deleteMany({
          where: { sectionId, questionNumber },
        });
      }
      if (!validOptions.has(option)) throw new Error("Cevaplar yalnızca A, B, C, D veya E olabilir.");
      return prisma.odkExamOfficialAnswer.upsert({
        where: { sectionId_questionNumber: { sectionId, questionNumber } },
        create: { examId, sectionId, questionNumber, correctOption: option },
        update: { correctOption: option },
      });
    });
  });

  await prisma.$transaction(operations);
  revalidatePath(`/odk/admin/sinavlar/${examId}`);
}

export async function importOutcomesJson(
  examId: string,
  json: Record<string, Record<string, OutcomesJson>>,
) {
  await requireOdkAdmin();

  const sections = await prisma.odkExamSection.findMany({
    where: { examId },
    select: { id: true, title: true },
  });

  const sectionMap = new Map(sections.map((s) => [s.title, s.id]));

  const upserts = Object.entries(json).flatMap(([sectionTitle, questions]) => {
    const sectionId = sectionMap.get(sectionTitle);
    if (!sectionId) return [];
    return Object.entries(questions).map(([num, outcomes]) =>
      prisma.odkExamOfficialAnswer.upsert({
        where: { sectionId_questionNumber: { sectionId, questionNumber: Number(num) } },
        create: { examId, sectionId, questionNumber: Number(num), correctOption: "", outcomes },
        update: { outcomes },
      })
    );
  });

  await prisma.$transaction(upserts);
  revalidatePath(`/odk/admin/sinavlar/${examId}`);
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

export async function deletePackage(packageId: string) {
  await requireOdkAdmin();
  await prisma.odkPackage.delete({ where: { id: packageId } });
  revalidatePath("/odk/admin/paketler");
  redirect("/odk/admin/paketler");
}

export async function togglePackageStatus(packageId: string, isActive: boolean) {
  await requireOdkAdmin();
  await prisma.odkPackage.update({ where: { id: packageId }, data: { isActive } });
  revalidatePath("/odk/admin/paketler");
  revalidatePath(`/odk/admin/paketler/${packageId}`);
}

export async function addExamToPackage(packageId: string, examId: string) {
  await requireOdkAdmin();
  await prisma.odkPackageExam.upsert({
    where: { packageId_examId: { packageId, examId } },
    create: { packageId, examId },
    update: {},
  });
  revalidatePath(`/odk/admin/paketler/${packageId}`);
  revalidatePath("/odk/admin/paketler");
}

export async function removeExamFromPackage(packageId: string, examId: string) {
  await requireOdkAdmin();
  await prisma.odkPackageExam.delete({
    where: { packageId_examId: { packageId, examId } },
  });
  revalidatePath(`/odk/admin/paketler/${packageId}`);
  revalidatePath("/odk/admin/paketler");
}

export async function addPackageAccessTag(packageId: string, accessTagId: string) {
  await requireOdkAdmin();
  await prisma.odkPackageAccessTag.upsert({
    where: { packageId_accessTagId: { packageId, accessTagId } },
    create: { packageId, accessTagId },
    update: {},
  });
  revalidatePath(`/odk/admin/paketler/${packageId}`);
}

export async function removePackageAccessTag(packageId: string, accessTagId: string) {
  await requireOdkAdmin();
  await prisma.odkPackageAccessTag.delete({
    where: { packageId_accessTagId: { packageId, accessTagId } },
  });
  revalidatePath(`/odk/admin/paketler/${packageId}`);
}

// ── Access Tags ───────────────────────────────────────────────────────────────

export async function createAccessTag(data: { key: string; title: string; description?: string }) {
  await requireOdkAdmin();
  await prisma.odkAccessTag.create({
    data: { key: data.key, title: data.title, description: data.description || null },
  });
  revalidatePath("/odk/admin/etiketler");
}

export async function toggleAccessTag(tagId: string, isActive: boolean) {
  await requireOdkAdmin();
  await prisma.odkAccessTag.update({ where: { id: tagId }, data: { isActive } });
  revalidatePath("/odk/admin/etiketler");
}

export async function deleteAccessTag(tagId: string) {
  await requireOdkAdmin();
  await prisma.odkAccessTag.delete({ where: { id: tagId } });
  revalidatePath("/odk/admin/etiketler");
}

export async function grantUserAccessTag(userId: string, accessTagId: string) {
  await requireOdkAdmin();

  const [user, tag] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } }),
    prisma.odkAccessTag.findUnique({ where: { id: accessTagId }, select: { title: true } }),
  ]);

  await prisma.odkUserAccessTag.upsert({
    where: { userId_accessTagId: { userId, accessTagId } },
    create: { userId, accessTagId, source: "MANUAL" },
    update: { revokedAt: null },
  });

  // Send welcome/access granted email (fire-and-forget)
  if (user && tag) {
    sendOdkAccessGranted({
      to: user.email,
      name: user.name ?? user.email,
      tagTitle: tag.title,
    }).catch(() => {});
  }

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
