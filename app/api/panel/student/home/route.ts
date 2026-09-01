import { NextResponse } from "next/server";
import { requireApiAccountRole } from "@/lib/auth/api-guards";
import { getStudentHomeData } from "@/lib/panel/student-home-server";
import { legacyTodayFromUnified } from "@/lib/student-success/unified-today-serializer";

/**
 * Mobil öğrenci ana sayfası. Ürün blokları ortak domain service'inden gelir;
 * unified today üç ürünü tek listede birleştirir.
 */
export async function GET() {
  const auth = await requireApiAccountRole("STUDENT");
  if (!auth.ok) return auth.response;

  const data = await getStudentHomeData({
    userId: auth.session.userId,
    role: auth.session.role,
  });

  const od = data.productData.OD;
  const ok = data.productData.OK;
  const odk = data.productData.ODK;
  const plan = ok?.weeklyPlan ?? null;
  const latest = odk?.latestExam ?? null;

  const unifiedItems = data.unifiedToday?.items ?? [];
  const legacyToday = unifiedItems.length
    ? legacyTodayFromUnified(unifiedItems)
    : {
        lessons: (od?.todayLessons ?? []).map((lesson) => ({
          id: lesson.id,
          startsAt: lesson.startsAt.toISOString(),
          title: lesson.title,
          teacherName: lesson.teacherName,
          groupName: lesson.groupName,
        })),
        tasks: (ok?.todayTasks ?? []).map((task) => ({
          id: task.id,
          title: task.title,
          durationMinutes: task.durationMinutes,
          scheduledFor: task.scheduledFor.toISOString(),
        })),
        assignments: [],
        mockExams: odk?.upcomingExam?.startsAt
          ? [{ id: odk.upcomingExam.id, title: odk.upcomingExam.title, startsAt: odk.upcomingExam.startsAt.toISOString() }]
          : [],
      };

  return NextResponse.json({
    products: data.products,
    profile: data.profile,
    fullName: auth.session.fullName,
    productData: data.productData,
    unifiedToday: data.unifiedToday,
    today: legacyToday,
    weeklyPlan: plan
      ? {
          done: plan.done,
          total: plan.total,
          tasks: plan.tasks.map((task) => ({
            id: task.id,
            title: task.title,
            durationMinutes: task.durationMinutes,
            done: task.done,
          })),
        }
      : null,
    latestExam: latest
      ? {
          id: latest.id,
          title: latest.title,
          takenAt: latest.takenAt.toISOString(),
          net: latest.net,
          delta: latest.delta,
          sections: latest.sections,
        }
      : null,
    trend: (odk?.trend ?? []).map((point) => ({
      takenAt: point.takenAt.toISOString(),
      net: point.net,
    })),
    hasODK: data.products.includes("ODK"),
  });
}
