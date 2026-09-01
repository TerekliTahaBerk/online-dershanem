import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Ders hedefi: grup VEYA bireysel öğrenci.
 * Bireysel yolda öğretmenin aktif grubunda kayıt yoksa 1 kişilik grup açılır.
 */
const groupInclude = {
  enrollments: {
    where: { endedAt: null },
    include: {
      student: {
        select: {
          id: true,
          userId: true,
          parents: { where: { active: true }, select: { parentId: true } },
        },
      },
    },
  },
} as const;

export async function resolveLessonTargetGroup(input: {
  targetType?: "GROUP" | "STUDENT";
  groupId?: string | null;
  studentId?: string | null;
  teacherId?: string | null;
  actorRole: "ADMIN" | "TEACHER";
  actorUserId: string;
  /** Önizleme gibi salt okunur yollarda bireysel grup yaratma. */
  createIfMissing?: boolean;
}) {
  const targetType = input.targetType ?? "GROUP";
  const createIfMissing = input.createIfMissing !== false;

  if (targetType === "GROUP") {
    if (!input.groupId) return { error: "Grup seçin." as const, group: null };
    const group = await prisma.group.findFirst({
      where: {
        id: input.groupId,
        isActive: true,
        ...(input.actorRole === "TEACHER" ? { teacherId: input.actorUserId } : {}),
      },
      include: groupInclude,
    });
    if (!group) return { error: "Aktif grup bulunamadı." as const, group: null };
    return { error: null, group };
  }

  if (!input.studentId) return { error: "Öğrenci seçin." as const, group: null };
  const teacherId =
    input.actorRole === "TEACHER" ? input.actorUserId : input.teacherId || null;
  if (!teacherId) return { error: "Öğretmen seçin." as const, group: null };
  if (input.actorRole === "TEACHER" && teacherId !== input.actorUserId) {
    return { error: "Yalnız kendi öğrencileriniz için ders planlayabilirsiniz." as const, group: null };
  }

  const student = await prisma.studentProfile.findFirst({
    where: { id: input.studentId, user: { status: "ACTIVE", role: "STUDENT" } },
    select: {
      id: true,
      userId: true,
      user: { select: { fullName: true, email: true } },
      parents: { where: { active: true }, select: { parentId: true } },
    },
  });
  if (!student) return { error: "Öğrenci bulunamadı." as const, group: null };

  if (input.actorRole === "TEACHER") {
    const allowed = await prisma.studentTeacherAssignment.findFirst({
      where: {
        studentId: student.id,
        teacherId,
        active: true,
        endedAt: null,
      },
      select: { id: true },
    });
    const enrolled = await prisma.enrollment.findFirst({
      where: {
        studentId: student.id,
        endedAt: null,
        group: { teacherId, isActive: true },
      },
      select: { id: true },
    });
    if (!allowed && !enrolled) {
      return { error: "Bu öğrenci sizin kapsamınızda değil." as const, group: null };
    }
  }

  const existing = await prisma.enrollment.findFirst({
    where: {
      studentId: student.id,
      endedAt: null,
      group: { teacherId, isActive: true },
    },
    select: { groupId: true },
  });

  let groupId = existing?.groupId ?? null;
  if (!groupId) {
    if (!createIfMissing) {
      return {
        error: "Bu öğrenci için henüz bireysel grup yok; oluşturma sırasında açılır." as const,
        group: null,
      };
    }
    const label = student.user.fullName || student.user.email;
    const created = await prisma.group.create({
      data: {
        name: `Bireysel · ${label}`,
        subject: "Bireysel",
        capacity: 1,
        teacherId,
        isActive: true,
        enrollments: { create: { studentId: student.id } },
      },
      select: { id: true },
    });
    groupId = created.id;
  }

  const group = await prisma.group.findFirst({
    where: { id: groupId, isActive: true },
    include: groupInclude,
  });
  if (!group) return { error: "Bireysel grup çözülemedi." as const, group: null };
  return { error: null, group };
}
