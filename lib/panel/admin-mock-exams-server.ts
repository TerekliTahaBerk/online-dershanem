import "server-only";

import { prisma } from "@/lib/prisma";
import { mockExamViewInclude } from "@/lib/mock-exam-view";

/**
 * DIŞ DENEMELER (Y18, `/panel/yonetim/denemeler`): aktif öğrenciler ve son
 * 100 dış deneme. Web sayfası ve mobil yönetim ucu
 * (`/api/panel/admin/mock-exams`) AYNI yükleyiciyi kullanır (sayfadan taşındı).
 */
export async function loadAdminMockExams() {
  const [students, exams] = await Promise.all([
    prisma.studentProfile.findMany({
      where: { user: { status: "ACTIVE" } },
      orderBy: { user: { fullName: "asc" } },
      include: { user: { select: { fullName: true, email: true } } },
    }),
    prisma.mockExam.findMany({
      orderBy: { takenAt: "desc" },
      take: 100,
      include: mockExamViewInclude,
    }),
  ]);
  return { students, exams };
}

export type AdminMockExams = Awaited<ReturnType<typeof loadAdminMockExams>>;
