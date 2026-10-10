import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAccountRole, requireApiOdRole } from "@/lib/auth/api-guards";
import { loadOdHome } from "@/lib/mobile/od-home-server";
import { getStudentHomeData } from "@/lib/panel/student-home-server";
import { legacyTodayFromUnified } from "@/lib/student-success/unified-today-serializer";

/**
 * Mobil öğrenci ana sayfası. Ürün blokları ortak domain service'inden gelir;
 * unified today üç ürünü tek listede birleştirir.
 *
 * `?scope=OD` (M2, mobil OD çalışma alanı): OD erişimi ZORUNLU ve yanıt
 * yalnız OD verisi taşır (`MobileOdHome`, `lib/mobile-contracts/student.ts`);
 * Yön planı ve Deneme Ligi sorguları hiç çalışmaz. Parametresiz istek
 * (eski mobil sürümler) birebir eski davranıştır.
 */
const querySchema = z.object({ scope: z.literal("OD").optional() });

export async function GET(request: Request) {
  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return NextResponse.json({ error: "Geçersiz çalışma alanı kapsamı." }, { status: 400 });
  if (query.data.scope === "OD") {
    const odAuth = await requireApiOdRole("STUDENT");
    if (!odAuth.ok) return odAuth.response;
    const body = await loadOdHome({ userId: odAuth.session.userId, role: odAuth.session.role, fullName: odAuth.session.fullName });
    return NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });
  }

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
