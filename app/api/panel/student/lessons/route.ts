import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { formatIstanbulDateInput } from "@/lib/istanbul-time";

/**
 * Öğrenci Dersler verisi — JSON karşılığı.
 *
 * `app/panel/ogrenci/takvim/page.tsx` ile AYNI sorgu ve durum/aksiyon
 * etiketleme mantığı; web sayfası bu turda bu route'a geçirilmedi (riski web
 * tarafına bulaştırmamak için, önceki Ana Sayfa route'uyla aynı disiplin).
 */
export async function GET(request: Request) {
  const auth = await requireApiOdRole("STUDENT");
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const filter = url.searchParams.get("durum") === "tamamlanan" ? "tamamlanan" : "yaklasan";

  const profile = await prisma.studentProfile.findUnique({ where: { userId: auth.session.userId } });
  if (!profile) {
    return NextResponse.json({ profile: null, groupNames: "", lessons: [] });
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: profile.id, endedAt: null },
    select: { groupId: true, group: { select: { name: true } } },
  });
  const groupIds = enrollments.map((e) => e.groupId);
  const groupNames = [...new Set(enrollments.map((e) => e.group.name))].join(" · ");

  const now = new Date();
  const lessons = groupIds.length
    ? await prisma.lesson.findMany({
        where: {
          groupId: { in: groupIds },
          ...(filter === "yaklasan"
            ? { startsAt: { gte: now }, status: "PLANNED" }
            : { OR: [{ status: "COMPLETED" }, { startsAt: { lt: now } }] }),
        },
        orderBy: { startsAt: filter === "yaklasan" ? "asc" : "desc" },
        take: 50,
        include: {
          group: { select: { name: true } },
          teacher: { select: { fullName: true } },
          attendances: { where: { studentId: profile.id }, select: { status: true } },
        },
      })
    : [];

  const rows = lessons.map((lesson) => {
    const attendance = lesson.attendances[0]?.status;
    const missed = attendance === "ABSENT";
    const isToday =
      formatIstanbulDateInput(lesson.startsAt) === formatIstanbulDateInput(now);
    const completed = lesson.status === "COMPLETED";

    const statusLabel = missed
      ? "Katılmadın"
      : completed
        ? "Tamamlandı"
        : isToday
          ? "Bugün"
          : lesson.status === "CANCELLED"
            ? "İptal edildi"
            : "Yaklaşıyor";

    const statusTone: "default" | "ok" | "warn" = missed ? "warn" : isToday && !completed ? "ok" : "default";

    const actionLabel = missed ? "Telafi et" : completed ? "Notları gör" : isToday ? "Derse katıl" : "Detay";
    const actionHref = missed ? `/panel/ogrenci/telafi?lessonId=${lesson.id}` : `/panel/ogrenci/takvim/${lesson.id}`;

    return {
      id: lesson.id,
      startsAt: lesson.startsAt,
      title: lesson.title,
      groupName: lesson.group.name,
      teacherName: lesson.teacher.fullName,
      statusLabel,
      statusTone,
      actionLabel,
      actionHref,
    };
  });

  return NextResponse.json({ profile: { id: profile.id }, groupNames, filter, lessons: rows });
}
