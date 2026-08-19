import "server-only";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * ÖĞRETMEN KAPSAMI — hangi öğrencinin verisi gösterilebilir?
 *
 * GÜVENLİK SINIRI: bir öğretmen YALNIZ kendi gruplarına kayıtlı öğrencileri
 * görebilir. Kapsam `Group.teacherId = <öğretmen>` üzerinden kurulur; URL'den
 * gelen `studentId` doğrudan kullanılmaz, bu küme içinde ARANIR.
 *
 * Kapsam dışı kimlik → 404 (403 değil). Veli kapsamındaki (`parent-scope`)
 * kararla aynı: "burada bir öğrenci var ama göremezsin" bilgisi bile sızmasın.
 *
 * Kayıt sonlanmışsa (`endedAt`) öğrenci artık bu öğretmenin kapsamında
 * DEĞİLDİR; geçmiş ders kaydı yetki vermez.
 */

export type TeacherStudent = {
  /** StudentProfile.id */
  id: string;
  userId: string;
  name: string;
  classLevel: string | null;
  targetGoal: string | null;
  /** Öğretmenin bu öğrenciyle kesiştiği aktif gruplar. */
  groups: { id: string; name: string; subject: string }[];
};

/** Öğretmenin kapsamındaki aktif grup kimlikleri. */
export async function teacherGroupIds(teacherUserId: string): Promise<string[]> {
  const groups = await prisma.group.findMany({
    where: { teacherId: teacherUserId, isActive: true },
    select: { id: true },
  });
  return groups.map((g) => g.id);
}

/**
 * Tek öğrenciyi öğretmen kapsamında çözer. Kapsam dışındaysa `notFound()`.
 */
export async function resolveTeacherStudent(
  teacherUserId: string,
  studentProfileId: string,
): Promise<TeacherStudent> {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentId: studentProfileId,
      endedAt: null,
      group: { teacherId: teacherUserId, isActive: true },
    },
    select: {
      group: { select: { id: true, name: true, subject: true } },
      student: {
        select: {
          id: true,
          userId: true,
          classLevel: true,
          targetGoal: true,
          user: { select: { fullName: true, email: true } },
        },
      },
    },
  });

  const first = enrollments[0];
  if (!first) notFound();

  return {
    id: first.student.id,
    userId: first.student.userId,
    name: first.student.user.fullName || first.student.user.email,
    classLevel: first.student.classLevel,
    targetGoal: first.student.targetGoal,
    groups: enrollments.map((e) => e.group),
  };
}
