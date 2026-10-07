import { notFound } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { TeacherReviewMonitor } from "@/components/panel/teacher-review-monitor";
import {
  PAGE_EYEBROW_CLASS,
  PAGE_TITLE_CLASS,
  PAGE_DESCRIPTION_CLASS,
} from "@/components/panel/ui";

export const dynamic = "force-dynamic";
export default async function TeacherReviewPage() {
  const session = await requireRole("TEACHER");
  if (!getPanelFeatureFlags().reviewQueue) notFound();
  const now = new Date();
  const since = new Date(now.getTime() - 30 * 86400000);
  const students = await prisma.studentProfile.findMany({
    where: {
      user: { status: "ACTIVE" },
      enrollments: {
        some: {
          endedAt: null,
          group: { teacherId: session.userId, isActive: true },
        },
      },
    },
    orderBy: { user: { fullName: "asc" } },
    include: {
      user: { select: { fullName: true, email: true } },
      _count: { select: { reviewItems: { where: { status: "ACTIVE" } } } },
      reviewItems: {
        where: { status: "ACTIVE" },
        orderBy: { dueAt: "asc" },
        take: 60,
        include: {
          attempts: {
            where: { reviewedAt: { gte: since } },
            select: { reviewedAt: true, response: true },
          },
        },
      },
    },
  });
  const rows = students.map((student) => {
    const lastReviewed =
      student.reviewItems
        .flatMap((item) => item.attempts.map((attempt) => attempt.reviewedAt))
        .sort((a, b) => b.getTime() - a.getTime())[0] || null;
    return {
      id: student.id,
      name: student.user.fullName || student.user.email,
      activeCount: student._count.reviewItems,
      dueCount: student.reviewItems.filter((item) => item.dueAt <= now).length,
      persistentCount: student.reviewItems.filter(
        (item) =>
          item.attempts.filter(
            (attempt) =>
              attempt.response === "WRONG" || attempt.response === "UNSURE",
          ).length >= 3,
      ).length,
      lastReviewedAt: lastReviewed?.toISOString() || null,
    };
  });
  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
    >
      <header>
        <p className={PAGE_EYEBROW_CLASS}>
          <RotateCcw size={15} /> Kalıcılık gözetimi
        </p>
        <h1 className={PAGE_TITLE_CLASS}>
          Kuyruk büyürse insan bakışı devreye girsin.
        </h1>
        <p className={PAGE_DESCRIPTION_CLASS}>
          Öğrencileri sıralamadan yalnız biriken çalışma ve üç kez tekrarlayan
          zorlanma sinyalini görün.
        </p>
      </header>
      <div className="mt-7">
        <TeacherReviewMonitor students={rows} />
      </div>
    </PanelShell>
  );
}
