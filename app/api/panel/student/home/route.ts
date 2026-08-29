import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { getAccessibleProducts } from "@/lib/auth/products";
import { netScore } from "@/lib/goals";

/**
 * Öğrenci Ana Sayfa verisi — JSON karşılığı.
 *
 * `app/panel/ogrenci/page.tsx` (Server Component) ile AYNI sorguları
 * çalıştırır; web sayfası bu turda bu route'u KULLANMAYA geçirilmedi (riski
 * web tarafına bulaştırmamak için), ama mantık ikinci kez yazılmadı — net
 * hesabı `lib/goals.ts`'teki `netScore`'dan geliyor, sayfadaki gibi yerel bir
 * kopya değil. Mobil bu route'u tüketir.
 */
export async function GET() {
  const auth = await requireApiRole("STUDENT");
  if (!auth.ok) return auth.response;

  const products = await getAccessibleProducts(auth.session.userId, auth.session.role);
  const hasOD = products.includes("OD");
  const hasOK = products.includes("OK");
  const hasODK = products.includes("ODK");

  if (products.length === 0) {
    return NextResponse.json({ products, profile: null });
  }

  const profile = await prisma.studentProfile.findUnique({ where: { userId: auth.session.userId } });
  if (!profile) {
    return NextResponse.json({ products, profile: null });
  }

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const enrollments = hasOD
    ? await prisma.enrollment.findMany({
        where: { studentId: profile.id, endedAt: null },
        select: { groupId: true },
      })
    : [];
  const groupIds = enrollments.map((e) => e.groupId);

  const todayLessons =
    hasOD && groupIds.length
      ? await prisma.lesson.findMany({
          where: {
            groupId: { in: groupIds },
            startsAt: { gte: dayStart, lt: dayEnd },
            status: "PLANNED",
          },
          orderBy: { startsAt: "asc" },
          include: { group: true, teacher: { select: { fullName: true } } },
        })
      : [];

  const [weeklyPlan, recentExams] = await Promise.all([
    hasOK
      ? prisma.weeklyPlan.findFirst({
          where: { studentId: profile.id },
          orderBy: { weekStart: "desc" },
          include: { tasks: { orderBy: [{ scheduledFor: "asc" }, { position: "asc" }] } },
        })
      : Promise.resolve(null),
    prisma.mockExam.findMany({
      where: { studentId: profile.id },
      orderBy: { takenAt: "desc" },
      take: 6,
      include: { sections: { orderBy: { position: "asc" } } },
    }),
  ]);

  const examNet = (sections: { correctCount: number; incorrectCount: number }[]) =>
    sections.reduce((sum, s) => sum + netScore(s.correctCount, s.incorrectCount), 0);

  const todayLessonRows = todayLessons.map((lesson) => ({
    id: lesson.id,
    startsAt: lesson.startsAt,
    title: lesson.title,
    teacherName: lesson.teacher.fullName,
    groupName: lesson.group.name,
  }));

  const todayTasks = (weeklyPlan?.tasks ?? []).filter(
    (t) => t.scheduledFor >= dayStart && t.scheduledFor < dayEnd,
  );

  const planTasks = (weeklyPlan?.tasks ?? []).slice(0, 3).map((t) => ({
    id: t.id,
    title: t.title,
    durationMinutes: t.durationMinutes,
    scheduledFor: t.scheduledFor,
    done: t.status === "DONE",
  }));
  const planDone = (weeklyPlan?.tasks ?? []).filter((t) => t.status === "DONE").length;
  const planTotal = weeklyPlan?.tasks.length ?? 0;

  const latest = recentExams[0] ?? null;
  const previous = recentExams[1] ?? null;
  const latestNet = latest ? examNet(latest.sections) : null;
  const delta = latest && previous ? latestNet! - examNet(previous.sections) : null;

  const trend = [...recentExams]
    .reverse()
    .map((exam) => ({ takenAt: exam.takenAt, net: Number(examNet(exam.sections).toFixed(2)) }));

  return NextResponse.json({
    products,
    profile: { id: profile.id },
    fullName: auth.session.fullName,
    today: {
      lessons: todayLessonRows,
      tasks: todayTasks.map((t) => ({ id: t.id, title: t.title, durationMinutes: t.durationMinutes, scheduledFor: t.scheduledFor })),
    },
    weeklyPlan: hasOK && weeklyPlan ? { done: planDone, total: planTotal, tasks: planTasks } : null,
    latestExam: latest
      ? {
          id: latest.id,
          title: latest.title || latest.exam,
          takenAt: latest.takenAt,
          net: latestNet,
          delta,
          sections: latest.sections.map((s) => ({
            name: s.subjectName,
            correct: s.correctCount,
            incorrect: s.incorrectCount,
            net: netScore(s.correctCount, s.incorrectCount),
          })),
        }
      : null,
    trend: trend.length >= 2 ? trend : [],
    hasODK,
  });
}
