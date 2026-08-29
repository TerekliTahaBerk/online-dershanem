import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { netScore } from "@/lib/goals";

/**
 * Öğrenci Gelişim verisi — JSON karşılığı.
 *
 * `app/panel/ogrenci/gelisim/page.tsx` ile AYNI üç sorgu (denemeler, katılım,
 * çalışma tamamlama) ve ders-bazlı seri hesabı; net formülü `lib/goals.ts`
 * → `netScore`'dan (ikinci kez yazılmadı). Web sayfası bu turda bu route'a
 * geçirilmedi (riskten kaçınmak için).
 */

const SERIES_COLORS = ["#14976B", "#E0A34A", "#5C7BA6", "#9C5340", "#6B7A73"];

export async function GET() {
  const auth = await requireApiOdRole("STUDENT");
  if (!auth.ok) return auth.response;

  const profile = await prisma.studentProfile.findUnique({ where: { userId: auth.session.userId } });
  if (!profile) {
    return NextResponse.json({ profile: null, weeklyGoal: null, series: [], labels: [], attendance: null, completion: null });
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: profile.id, endedAt: null },
    select: { groupId: true },
  });
  const groupIds = enrollments.map((e) => e.groupId);

  const [exams, attendance, assignments] = await Promise.all([
    prisma.mockExam.findMany({
      where: { studentId: profile.id },
      orderBy: { takenAt: "asc" },
      take: 6,
      include: { sections: { orderBy: { position: "asc" } } },
    }),
    prisma.attendance.findMany({
      where: { studentId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { lesson: { select: { startsAt: true } } },
    }),
    groupIds.length
      ? prisma.assignment.findMany({
          where: { isActive: true, groupId: { in: groupIds } },
          include: { progress: { where: { studentId: profile.id }, select: { status: true } } },
        })
      : Promise.resolve([]),
  ]);

  const labels = exams.map((_, i) => `D${i + 1}`);
  const subjectNames = [...new Set(exams.flatMap((e) => e.sections.map((s) => s.subjectName)))];
  const series = subjectNames.map((name, idx) => ({
    name,
    color: SERIES_COLORS[idx % SERIES_COLORS.length],
    nets: exams.map((exam) => {
      const s = exam.sections.find((x) => x.subjectName === name);
      return s ? Number(netScore(s.correctCount, s.incorrectCount).toFixed(2)) : 0;
    }),
  }));

  const trendCaption =
    series.length && exams.length >= 2
      ? series
          .map((s) => {
            const first = s.nets[0];
            const last = s.nets[s.nets.length - 1];
            const dir = last > first ? "yükseldi" : last < first ? "geriledi" : "sabit kaldı";
            return `${s.name} neti ${first.toLocaleString("tr-TR")} → ${last.toLocaleString("tr-TR")} (${dir})`;
          })
          .join(". ") + "."
      : null;

  const attended = attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
  const missedLesson = attendance.find((a) => a.status === "ABSENT");

  const totalAssignments = assignments.length;
  const doneAssignments = assignments.filter((a) => a.progress[0]?.status === "DONE").length;
  const completionPct = totalAssignments > 0 ? Math.round((doneAssignments / totalAssignments) * 100) : null;

  return NextResponse.json({
    profile: { id: profile.id },
    weeklyGoal: profile.weeklyGoal || null,
    series,
    labels,
    trendCaption,
    attendance: attendance.length
      ? { attended, total: attendance.length, missedLessonAt: missedLesson?.lesson?.startsAt ?? null }
      : null,
    completion: completionPct !== null ? { done: doneAssignments, total: totalAssignments, pct: completionPct } : null,
  });
}
