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
import { auditLog } from "@/lib/audit";

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
    description?: string | null;
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

    for (const [orderIndex, section] of sections.entries()) {
      if (!section.id) continue;
      const current = existingById.get(section.id);
      if (!current) throw new Error("Güncellenecek bölüm bulunamadı.");
      if (hasAttempts && section.questionCount < current.questionCount) {
        throw new Error("Katılım başlamış sınavlarda soru sayısı azaltılamaz.");
      }
      if (hasAttempts) {
        // P1: prevent title/order changes — sectionScores JSON and stats aggregate
        // by title; renaming or reordering after attempts start corrupts analytics.
        const currentSection = await tx.odkExamSection.findUnique({
          where: { id: section.id },
          select: { title: true, orderIndex: true },
        });
        if (currentSection && currentSection.title !== section.title) {
          throw new Error(`Katılım başlamış sınavlarda bölüm adı değiştirilemez ("${currentSection.title}").`);
        }
        if (currentSection && currentSection.orderIndex !== orderIndex) {
          throw new Error("Katılım başlamış sınavlarda bölüm sırası değiştirilemez.");
        }
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
        description: data.description?.trim() || null,
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

async function autoSubmitExpiredAttempts(examId: string) {
  const exam = await prisma.odkExam.findUnique({
    where: { id: examId },
    select: {
      durationMinutes: true,
      startsAt: true,
      sections: {
        select: {
          id: true,
          title: true,
          questionCount: true,
          officialAnswers: { select: { questionNumber: true, correctOption: true, outcomes: true } },
        },
      },
    },
  });
  if (!exam) return;

  const deadlineMs = exam.startsAt
    ? exam.startsAt.getTime() + exam.durationMinutes * 60 * 1000 + 5 * 60 * 1000
    : Date.now(); // if no startsAt, use now as safe cutoff

  if (Date.now() < deadlineMs) return; // exam still running

  const stale = await prisma.odkExamAttempt.findMany({
    where: {
      examId,
      status: "IN_PROGRESS",
      startedAt: { lt: new Date(deadlineMs - exam.durationMinutes * 60 * 1000) },
    },
    select: {
      id: true,
      startedAt: true,
      opticalAnswers: { select: { sectionId: true, questionNumber: true, selectedOption: true } },
    },
  });

  if (stale.length === 0) return;

  const hasSectionScoresColumn = await (await import("@/lib/odk-exam-schema")).hasOdkExamAttemptSectionScoresColumn();

  for (const attempt of stale) {
    // Rebuild answers map from stored optical answers
    const answerMap: Record<string, Record<number, string>> = {};
    for (const oa of attempt.opticalAnswers) {
      answerMap[oa.sectionId] ??= {};
      answerMap[oa.sectionId][oa.questionNumber] = oa.selectedOption;
    }

    let totalCorrect = 0;
    let totalWrong = 0;
    let totalBlank = 0;
    const sectionScores: Array<{
      sectionId: string; title: string; questionCount: number;
      correct: number; wrong: number; blank: number; net: number;
    }> = [];

    for (const section of exam.sections) {
      const userSection = answerMap[section.id] ?? {};
      let correct = 0; let wrong = 0; let blank = 0;

      for (const official of section.officialAnswers) {
        const ans = userSection[official.questionNumber];
        if (!ans) blank++;
        else if (ans === official.correctOption) correct++;
        else wrong++;
      }

      const unanswered = section.questionCount - section.officialAnswers.length - blank;
      blank += Math.max(0, unanswered);

      totalCorrect += correct;
      totalWrong += wrong;
      totalBlank += blank;
      sectionScores.push({
        sectionId: section.id, title: section.title,
        questionCount: section.questionCount,
        correct, wrong, blank, net: correct - wrong / 4,
      });
    }

    const net = totalCorrect - totalWrong / 4;
    const rawSecs = Math.round((Date.now() - attempt.startedAt.getTime()) / 1000);

    // Kazanım breakdown from outcomes metadata
    type KazanimStat = { konu: string; kazanim: string; correct: number; wrong: number; blank: number };
    const kazanimMap: Record<string, KazanimStat> = {};
    for (const section of exam.sections) {
      const userSection = answerMap[section.id] ?? {};
      for (const official of section.officialAnswers) {
        const raw = official.outcomes as { konu?: string; kazanim?: string } | null;
        if (!raw?.konu || !raw?.kazanim) continue;
        const key = `${raw.konu}::${raw.kazanim}`;
        kazanimMap[key] ??= { konu: raw.konu, kazanim: raw.kazanim, correct: 0, wrong: 0, blank: 0 };
        const ans = userSection[official.questionNumber];
        if (!ans) kazanimMap[key].blank++;
        else if (ans === official.correctOption) kazanimMap[key].correct++;
        else kazanimMap[key].wrong++;
      }
    }
    const kazanimBreakdown = Object.values(kazanimMap);

    // P1: atomic status transition — use updateMany with status guard to prevent
    // race conditions if two admin actions trigger auto-submit simultaneously.
    await prisma.odkExamAttempt.updateMany({
      where: { id: attempt.id, status: "IN_PROGRESS" },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        score: net,
        correctCount: totalCorrect,
        wrongCount: totalWrong,
        blankCount: totalBlank,
        durationSeconds: Math.min(rawSecs, exam.durationMinutes * 60),
        resultPayload: { net, sectionScores, kazanimBreakdown },
        ...(hasSectionScoresColumn ? { sectionScores: sectionScores as unknown as never } : {}),
      },
    });
  }
}

export async function releaseExamResults(examId: string) {
  await requireOdkAdmin();
  await requireOdkExamResultsReleasedAtColumn();

  // Auto-close any stale IN_PROGRESS attempts before releasing
  await autoSubmitExpiredAttempts(examId);
  // P1: sync expired entitlements so DB state is clean before we read it
  const { syncExpiredEntitlements } = await import("@/lib/odk-access");
  await syncExpiredEntitlements();

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
      user: { select: { id: true, email: true, name: true } },
    },
  });

  const emailResults = await Promise.allSettled(
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

  // P1: log failed deliveries + drop an in-app Notification so the student
  // can still see results even if the email bounced.
  const failedEmails: string[] = [];
  for (let i = 0; i < emailResults.length; i++) {
    const result = emailResults[i];
    const attempt = attempts[i];
    if (result.status === "rejected") {
      failedEmails.push(attempt.user.email);
      console.error(`[releaseExamResults] email failed for ${attempt.user.email}:`, result.reason);
    }
  }
  if (failedEmails.length > 0) {
    console.warn(`[releaseExamResults] ${failedEmails.length} email(s) failed for exam ${examId}:`, failedEmails);
  }

  // Drop in-app notification for every student regardless of email status.
  await prisma.notification.createMany({
    data: attempts.map((a) => ({
      userId: a.user.id,
      type: "ANNOUNCEMENT" as const,
      priority: "NORMAL" as const,
      title: "Sınav sonuçları açıklandı",
      body: `"${exam.title}" sınavının sonuçları artık görüntülenebilir.`,
      actionUrl: `/odk/panel/sinavlar/${examId}`,
    })),
    skipDuplicates: true,
  });

  await auditLog({
    entityType: "OdkExam",
    entityId: examId,
    action: "RELEASE_RESULTS",
    summary: `Sınav sonuçları yayınlandı: ${exam.title}`,
    payload: { examId, title: exam.title, notifiedCount: attempts.length, failedEmails },
  });

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

export async function updateExam(examId: string, data: {
  title?: string;
  cadenceFamily?: string;
  durationMinutes?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  description?: string | null;
}) {
  await requireOdkAdmin();

  await prisma.odkExam.update({
    where: { id: examId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.cadenceFamily !== undefined ? { cadenceFamily: data.cadenceFamily as never } : {}),
      ...(data.durationMinutes !== undefined ? { durationMinutes: data.durationMinutes } : {}),
      ...(data.startsAt !== undefined ? { startsAt: data.startsAt ? new Date(data.startsAt) : null } : {}),
      ...(data.endsAt !== undefined ? { endsAt: data.endsAt ? new Date(data.endsAt) : null } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
    },
  });

  revalidatePath(`/odk/admin/sinavlar/${examId}`);
  revalidatePath(`/odk/panel/sinavlar/${examId}`);
  revalidatePath("/odk/panel/sinavlar");
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

  const validOptions = new Set(["A", "B", "C", "D", "E"]);
  const skipped: string[] = [];

  const upserts = Object.entries(json).flatMap(([sectionTitle, questions]) => {
    const sectionId = sectionMap.get(sectionTitle);
    if (!sectionId) {
      skipped.push(`Bölüm bulunamadı: "${sectionTitle}"`);
      return [];
    }
    return Object.entries(questions).flatMap(([num, outcomes]) => {
      const questionNumber = Number(num);
      if (!Number.isInteger(questionNumber) || questionNumber < 1) {
        skipped.push(`Geçersiz soru numarası: ${num}`);
        return [];
      }
      // P1: only upsert outcomes — correctOption stays as-is if already set.
      // An empty-string correctOption would silently corrupt answer keys; skip those rows.
      return [prisma.odkExamOfficialAnswer.upsert({
        where: { sectionId_questionNumber: { sectionId, questionNumber } },
        create: {
          examId, sectionId, questionNumber,
          // Leave correctOption empty only if there's an existing row to merge into;
          // for creates we require a valid option or skip entirely.
          correctOption: validOptions.has((outcomes as unknown as { correctOption?: string }).correctOption ?? "")
            ? (outcomes as unknown as { correctOption: string }).correctOption
            : "",
          outcomes,
        },
        update: { outcomes },
      })];
    });
  });

  if (skipped.length > 0) {
    console.warn("[importOutcomesJson] skipped entries:", skipped);
  }

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

export async function updateOdkPackage(packageId: string, data: {
  title?: string;
  description?: string | null;
  priceCents?: number;
  durationDays?: number | null;
}) {
  await requireOdkAdmin();
  await prisma.odkPackage.update({
    where: { id: packageId },
    data,
  });
  revalidatePath(`/odk/admin/paketler/${packageId}`);
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

export async function grantUserAccessTag(
  userId: string,
  accessTagId: string,
  options?: { expiresAt?: string | null },
) {
  await requireOdkAdmin();

  const [user, tag] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } }),
    prisma.odkAccessTag.findUnique({ where: { id: accessTagId }, select: { title: true } }),
  ]);

  const expiresAt = options?.expiresAt ? new Date(options.expiresAt) : null;

  await prisma.odkUserAccessTag.upsert({
    where: { userId_accessTagId: { userId, accessTagId } },
    create: { userId, accessTagId, source: "MANUAL", expiresAt, revokedAt: null },
    update: { revokedAt: null, expiresAt },
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

export async function extendUserAccessTag(userId: string, accessTagId: string, newExpiresAt: string | null) {
  await requireOdkAdmin();
  await prisma.odkUserAccessTag.update({
    where: { userId_accessTagId: { userId, accessTagId } },
    data: { expiresAt: newExpiresAt ? new Date(newExpiresAt) : null, revokedAt: null },
  }).catch(() => {});
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

// ── Entitlements (package-based access) ──────────────────────────────────────

export async function createManualOdkEntitlement(
  userId: string,
  packageId: string,
  options?: { expiresAt?: string | null },
) {
  const session = await requireOdkAdmin();

  const pkg = await prisma.odkPackage.findUnique({
    where: { id: packageId },
    select: {
      title: true,
      durationDays: true,
      packageAccessTags: { select: { accessTagId: true, accessTag: { select: { title: true } } } },
    },
  });
  if (!pkg) throw new Error("Paket bulunamadı");

  // Compute expiry: explicit > package durationDays > null
  let expiresAt: Date | null = null;
  if (options?.expiresAt) {
    expiresAt = new Date(options.expiresAt);
  } else if (pkg.durationDays) {
    expiresAt = new Date(Date.now() + pkg.durationDays * 86_400_000);
  }

  // Create the entitlement
  const entitlement = await prisma.odkEntitlement.create({
    data: {
      userId,
      packageId,
      status: "ACTIVE",
      expiresAt,
    },
    select: { id: true },
  });

  // Grant all package access tags, linked to this entitlement
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });

  await Promise.all(
    pkg.packageAccessTags.map(async ({ accessTagId, accessTag }) => {
      await prisma.odkUserAccessTag.upsert({
        where: { userId_accessTagId: { userId, accessTagId } },
        create: {
          userId,
          accessTagId,
          source: "MANUAL",
          grantedById: session.user.id,
          entitlementId: entitlement.id,
          expiresAt,
          revokedAt: null,
        },
        update: {
          revokedAt: null,
          expiresAt,
          entitlementId: entitlement.id,
          source: "MANUAL",
        },
      });

      // Send access granted email (fire-and-forget)
      if (user) {
        sendOdkAccessGranted({
          to: user.email,
          name: user.name ?? user.email,
          tagTitle: accessTag.title,
        }).catch(() => {});
      }
    }),
  );

  revalidatePath("/odk/admin/ogrenciler");
  return entitlement.id;
}

export async function revokeOdkEntitlement(entitlementId: string) {
  await requireOdkAdmin();

  const now = new Date();

  await prisma.odkEntitlement.update({
    where: { id: entitlementId },
    data: { status: "REVOKED", revokedAt: now },
  });

  // Revoke all linked user access tags
  await prisma.odkUserAccessTag.updateMany({
    where: { entitlementId, revokedAt: null },
    data: { revokedAt: now },
  });

  await auditLog({
    entityType: "OdkEntitlement",
    entityId: entitlementId,
    action: "REVOKE",
    summary: `ODK yetkisi iptal edildi: ${entitlementId}`,
    payload: { entitlementId },
  });

  revalidatePath("/odk/admin/ogrenciler");
}

export async function extendOdkEntitlement(entitlementId: string, newExpiresAt: string | null) {
  await requireOdkAdmin();

  const expiresAt = newExpiresAt ? new Date(newExpiresAt) : null;

  await prisma.odkEntitlement.update({
    where: { id: entitlementId },
    data: { expiresAt, status: "ACTIVE", revokedAt: null },
  });

  // Also extend all linked user access tags
  await prisma.odkUserAccessTag.updateMany({
    where: { entitlementId },
    data: { expiresAt, revokedAt: null },
  });

  revalidatePath("/odk/admin/ogrenciler");
}
