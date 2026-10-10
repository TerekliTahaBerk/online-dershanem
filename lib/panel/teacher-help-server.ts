import "server-only";

import { prisma } from "@/lib/prisma";
import { teacherHelpScope } from "@/lib/student-help-target";

/**
 * ÖĞRETMEN YARDIM KUTUSU yükleyicisi — web `app/panel/ogretmen/yardim` ve
 * mobil `GET /api/panel/staff/teacher/help` aynı sorguyu kullanır.
 * Kapsam `teacherHelpScope` (yalnız `shareWithTeacher = true` check-in'ler;
 * grubun öğretmeni + aktif kayıt ya da aktif koç ataması). Grup kaydı bitmiş
 * öğrencinin isteği listeden düşer (yanıt ucu da 404 verir).
 */
export async function loadTeacherHelpInbox(teacherId: string) {
  const requests = await prisma.studentHelpRequest.findMany({
    where: {
      status: { in: ["OPEN", "RESPONDED"] },
      ...teacherHelpScope(teacherId),
    },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { id: "asc" }],
    include: {
      group: { select: { name: true } },
      student: {
        include: { user: { select: { fullName: true, email: true } } },
      },
      checkIn: true,
      responses: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { action: true },
      },
    },
  });

  const visible = await Promise.all(
    requests.map(async (item) => ({
      item,
      active: !item.groupId || Boolean(
        await prisma.enrollment.findFirst({
          where: {
            studentId: item.studentId,
            groupId: item.groupId!,
            endedAt: null,
          },
          select: { id: true },
        }),
      ),
    })),
  );

  return visible.filter((entry) => entry.active).map((entry) => entry.item);
}
