import "server-only";

import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ScopedStudent = { id: string; userId: string };

/**
 * "Bu izleyici bu öğrencinin verisini görebilir mi?" — TEK karar noktası.
 *
 * GÜVENLİK SINIRI: `studentId` isteğin kendisinden (query string veya rota
 * parametresi) geliyor. Bu yüzden asla doğrudan kullanılamaz; her zaman
 * izleyicinin kapsamı içinde DOĞRULANIR.
 *
 * Kapsam dışı kimlik `null` döner ve çağıran 404 verir — 403 değil: "burada bir
 * öğrenci var ama göremezsin" bilgisi bile sızmasın. `lib/panel/parent-scope`
 * ve `lib/panel/teacher-scope` sayfa tarafında aynı kararı verir.
 *
 * NEDEN BURADA: birleşik takvim uç noktası (`/api/panel/student-success/calendar`)
 * `studentId`'yi hiç doğrulamadan kullanıyordu; VELİ ve ÖĞRETMEN rolündeki
 * herkes query string'i değiştirerek HERHANGİ bir öğrencinin ders, ödev, koçluk
 * görevi ve deneme takvimini okuyabiliyordu. Kardeş uç nokta (`progress`) kendi
 * kopyasında doğru kontrolü yapıyordu; kopya olduğu için de birlikte
 * güncellenmiyordu. Karar artık tek yerde.
 */
export async function resolveStudentScopeForViewer(
  studentId: string,
  role: UserRole,
  viewerUserId: string,
): Promise<ScopedStudent | null> {
  const profile = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    select: { id: true, userId: true },
  });
  if (!profile) return null;

  if (role === "ADMIN") return profile;

  if (role === "STUDENT") {
    return profile.userId === viewerUserId ? profile : null;
  }

  if (role === "PARENT") {
    const link = await prisma.parentStudent.findFirst({
      where: { parentId: viewerUserId, studentId, active: true, endedAt: null },
      select: { id: true },
    });
    return link ? profile : null;
  }

  if (role === "TEACHER") {
    // Sayfa tarafındaki `resolveTeacherStudent` ile aynı üç yol: aktif grup
    // kaydı, branş bazlı doğrudan atama, koçluk ataması. Bu uçta doğrudan
    // atama unutulmuştu ve öğretmen kendi bireysel öğrencisini göremiyordu.
    const [enrollment, direct, coach] = await Promise.all([
      prisma.enrollment.findFirst({
        where: { studentId, endedAt: null, group: { teacherId: viewerUserId, isActive: true } },
        select: { id: true },
      }),
      prisma.studentTeacherAssignment.findFirst({
        where: { studentId, teacherId: viewerUserId, active: true, endedAt: null },
        select: { id: true },
      }),
      prisma.coachAssignment.findFirst({
        where: { studentId, coach: { userId: viewerUserId }, endedAt: null },
        select: { id: true },
      }),
    ]);
    return enrollment || direct || coach ? profile : null;
  }

  return null;
}
