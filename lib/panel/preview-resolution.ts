import "server-only";

import type { UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  isPreviewableRole,
  type PreviewableRole,
  type PreviewSubject,
  type PreviewSubjectNotice,
} from "@/lib/panel/preview-context";

/**
 * Preview subject çözümleme — URL/cookie userId'ye güvenilmez.
 * Her request'te DB doğrulaması yapılır.
 */

export type PreviewResolutionError =
  | "USER_NOT_FOUND"
  | "ROLE_MISMATCH"
  | "DELETED_OR_MISSING"
  | "CORRUPTED_RELATIONSHIP";

export type PreviewResolutionResult =
  | { ok: true; subject: PreviewSubject }
  | { ok: false; error: PreviewResolutionError };

export async function resolvePreviewSubject(input: {
  previewRole: PreviewableRole;
  previewUserId: string;
}): Promise<PreviewResolutionResult> {
  const user = await prisma.user.findUnique({
    where: { id: input.previewUserId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      status: true,
      inviteAcceptedAt: true,
      mustChangePassword: true,
      studentProfile: { select: { id: true } },
      teacherProfile: { select: { id: true } },
      parentStudents: { select: { studentId: true }, take: 1 },
      taughtGroups: {
        where: { isActive: true },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!user) return { ok: false, error: "USER_NOT_FOUND" };
  if (!isPreviewableRole(user.role)) return { ok: false, error: "ROLE_MISMATCH" };
  if (user.role !== input.previewRole) return { ok: false, error: "ROLE_MISMATCH" };

  const notices: PreviewSubjectNotice[] = [];
  if (user.status === "ARCHIVED") notices.push("ARCHIVED");
  if (user.status === "SUSPENDED") notices.push("SUSPENDED");
  if (!user.inviteAcceptedAt) notices.push("INVITE_PENDING");
  if (user.mustChangePassword) notices.push("MUST_CHANGE_PASSWORD");

  if (user.role === "STUDENT" && !user.studentProfile) {
    return { ok: false, error: "CORRUPTED_RELATIONSHIP" };
  }
  if (user.role === "TEACHER") {
    // TeacherProfile opsiyonel olabilir; atanmış grup yoksa uyarı ver ama preview'a izin ver.
    if (user.taughtGroups.length === 0) notices.push("NO_TEACHER_ASSIGNMENT");
  }
  if (user.role === "PARENT" && user.parentStudents.length === 0) {
    notices.push("NO_PARENT_CHILDREN");
  }

  return {
    ok: true,
    subject: {
      userId: user.id,
      role: user.role,
      email: user.email,
      fullName: user.fullName,
      status: user.status as UserStatus,
      notices,
    },
  };
}

export type PreviewCandidate = {
  userId: string;
  fullName: string | null;
  email: string;
  status: UserStatus;
  detail: string | null;
  invitePending: boolean;
};

export async function searchPreviewCandidates(input: {
  role: PreviewableRole;
  query: string;
  limit?: number;
}): Promise<PreviewCandidate[]> {
  const q = input.query.trim();
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 40);

  if (input.role === "STUDENT") {
    const students = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        ...(q
          ? {
              OR: [
                { fullName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { id: { contains: q } },
                { studentProfile: { id: { contains: q } } },
                {
                  studentProfile: {
                    enrollments: {
                      some: {
                        endedAt: null,
                        group: { name: { contains: q, mode: "insensitive" } },
                      },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      take: limit,
      orderBy: [{ fullName: "asc" }, { email: "asc" }],
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        inviteAcceptedAt: true,
        studentProfile: {
          select: {
            id: true,
            enrollments: {
              where: { endedAt: null },
              take: 3,
              select: { group: { select: { name: true } } },
            },
          },
        },
      },
    });

    return students.map((user) => {
      const groups = user.studentProfile?.enrollments.map((e) => e.group.name).filter(Boolean) ?? [];
      return {
        userId: user.id,
        fullName: user.fullName,
        email: user.email,
        status: user.status,
        invitePending: !user.inviteAcceptedAt,
        detail: [
          user.studentProfile ? `Öğrenci ID: ${user.studentProfile.id}` : null,
          groups.length ? `Grup: ${groups.join(", ")}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || null,
      };
    });
  }

  if (input.role === "PARENT") {
    const parents = await prisma.user.findMany({
      where: {
        role: "PARENT",
        ...(q
          ? {
              OR: [
                { fullName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { id: { contains: q } },
                {
                  parentStudents: {
                    some: {
                      student: {
                        OR: [
                          { user: { fullName: { contains: q, mode: "insensitive" } } },
                          { user: { email: { contains: q, mode: "insensitive" } } },
                        ],
                      },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      take: limit,
      orderBy: [{ fullName: "asc" }, { email: "asc" }],
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        inviteAcceptedAt: true,
        parentStudents: {
          take: 4,
          select: {
            student: { select: { user: { select: { fullName: true, email: true } } } },
          },
        },
      },
    });

    return parents.map((user) => {
      const children = user.parentStudents.map(
        (link) => link.student.user.fullName || link.student.user.email,
      );
      return {
        userId: user.id,
        fullName: user.fullName,
        email: user.email,
        status: user.status,
        invitePending: !user.inviteAcceptedAt,
        detail: children.length ? `Bağlı: ${children.join(", ")}` : "Bağlı öğrenci yok",
      };
    });
  }

  const teachers = await prisma.user.findMany({
    where: {
      role: "TEACHER",
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { id: { contains: q } },
              {
                taughtGroups: {
                  some: {
                    OR: [
                      { name: { contains: q, mode: "insensitive" } },
                      { subject: { contains: q, mode: "insensitive" } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    },
    take: limit,
    orderBy: [{ fullName: "asc" }, { email: "asc" }],
    select: {
      id: true,
      fullName: true,
      email: true,
      status: true,
      inviteAcceptedAt: true,
      taughtGroups: {
        where: { isActive: true },
        take: 4,
        select: { name: true, subject: true },
      },
    },
  });

  return teachers.map((user) => {
    const groups = user.taughtGroups.map((g) => (g.subject ? `${g.name} (${g.subject})` : g.name));
    return {
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      status: user.status,
      invitePending: !user.inviteAcceptedAt,
      detail: groups.length ? `Grup/ders: ${groups.join(", ")}` : "Aktif grup yok",
    };
  });
}

export function previewErrorMessage(error: PreviewResolutionError | "FORBIDDEN" | "NOT_ADMIN"): string {
  switch (error) {
    case "USER_NOT_FOUND":
      return "Kullanıcı bulunamadı.";
    case "ROLE_MISMATCH":
      return "Seçilen kullanıcı istenen role sahip değil.";
    case "DELETED_OR_MISSING":
      return "Bu kullanıcı önizlenemez.";
    case "CORRUPTED_RELATIONSHIP":
      return "Kullanıcı ilişkileri eksik veya bozuk; önizleme açılamadı.";
    case "FORBIDDEN":
      return "Panel önizleme izniniz yok.";
    case "NOT_ADMIN":
      return "Yalnız yöneticiler panel önizlemesi başlatabilir.";
  }
}
