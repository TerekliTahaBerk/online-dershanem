import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildUserWhere, parseUserListFilters } from "@/lib/panel/user-filters";
import { parsePeopleView, peopleViewWhere, viewAllowsRoleFilter, type PeopleQuery } from "@/lib/panel/people-views";

/**
 * KİŞİLER dizini verisi (`/panel/yonetim/kisiler`). Web sayfası ve mobil
 * yönetim ucu (`/api/panel/admin/people`) AYNI görünüm / süzgeç / sayfalama
 * kurallarını ve AYNI sorguyu kullanır (sayfadan değişmeden taşındı).
 */
export const PEOPLE_PAGE_SIZE = 30;
const PAGE_SIZE = PEOPLE_PAGE_SIZE;
const VIEW_ROLE = { ogrenciler: "STUDENT", veliler: "PARENT", ogretmenler: "TEACHER" } as const;

export async function loadPeopleDirectory(sp: { q?: string; sekme?: string; sayfa?: string; rol?: string; urun?: string; durum?: string }) {
  const view = parsePeopleView(sp.sekme, sp.rol);
  const filters = parseUserListFilters(sp);
  const rol = viewAllowsRoleFilter(view) ? filters.rol : view in VIEW_ROLE ? VIEW_ROLE[view as keyof typeof VIEW_ROLE] : "";
  const query: PeopleQuery = { view, q: filters.q, rol: viewAllowsRoleFilter(view) ? filters.rol : "", urun: filters.urun, durum: filters.durum };
  const page = Math.max(1, Number.parseInt(sp.sayfa ?? "1", 10) || 1);
  const where: Prisma.UserWhereInput = { AND: [buildUserWhere({ ...filters, rol }), peopleViewWhere(view)] };
  const bulkApplies = view === "tumu" || view in VIEW_ROLE;
  const today = new Date();
  const dayStart = new Date(today);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60_000);

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ fullName: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        lastLoginAt: true,
        inviteAcceptedAt: true,
        productMemberships: { where: { revokedAt: null }, select: { product: true, source: true } },
        productStaffAssignments: { where: { revokedAt: null }, select: { role: true } },
        studentProfile: {
          select: {
            id: true,
            classLevel: true,
            examType: true,
            parents: { where: { active: true }, select: { parent: { select: { fullName: true, email: true } } }, take: 2 },
            enrollments: {
              where: { endedAt: null },
              select: { group: { select: { name: true, teacher: { select: { fullName: true, email: true } } } } },
              take: 2,
            },
            teacherAssignments: { where: { active: true }, select: { subject: true, teacher: { select: { fullName: true, email: true } } }, take: 3 },
            coachAssignments: { where: { endedAt: null }, select: { coach: { select: { user: { select: { fullName: true, email: true } } } } }, take: 1 },
          },
        },
        teacherProfile: {
          select: { subjects: true, isCoach: true, coachCapacity: true, _count: { select: { coachAssignments: { where: { endedAt: null } } } } },
        },
        taughtGroups: { where: { isActive: true }, select: { id: true, _count: { select: { enrollments: { where: { endedAt: null } } } } } },
        studentTeacherAssignments: { where: { active: true }, select: { id: true } },
        taughtLessons: { where: { status: "PLANNED", startsAt: { gte: dayStart, lt: dayEnd } }, select: { id: true } },
        parentStudents: { where: { active: true }, select: { student: { select: { user: { select: { fullName: true, email: true } } } } }, take: 3 },
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  /** Görünümün etkin rol süzgeci (rol sekmelerinde görünümden gelir); toplu işlem bunu kullanır. */
  return { view, filters, rol, query, page, pages, total, users, bulkApplies };
}

export type PeopleDirectory = Awaited<ReturnType<typeof loadPeopleDirectory>>;
export type PeopleDirectoryUser = PeopleDirectory["users"][number];

/** Ödemesi alınmış ama erişimi açılmamış öğrenci sayısı (web Öğrenciler sayfası ve mobil dizin). */
export function countStudentsAwaitingAccess() {
  return prisma.user.count({
    where: {
      role: "STUDENT",
      odOrders: {
        some: { status: "PAID", provisioningStatus: { not: "SUCCEEDED" } },
      },
    },
  });
}
