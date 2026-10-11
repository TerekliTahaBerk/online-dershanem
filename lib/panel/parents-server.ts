import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * VELİLER verisi (`/panel/yonetim/veliler`): veli listesi (süzgeç + sayfa),
 * bağlantısız veli sayısı, aktif veli–öğrenci bağlantıları, bağlantı geçmişi
 * ve bağlantı formu seçenekleri. Web sayfası ve mobil yönetim ucu
 * (`/api/panel/admin/parents`) AYNI yükleyiciyi kullanır (sayfadan taşındı).
 */
export const PARENTS_PAGE_SIZE = 25;
const PAGE_SIZE = PARENTS_PAGE_SIZE;

export const PARENT_STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Tümü" },
  { value: "baglantisiz", label: "Öğrenci bağlantısı yok" },
  { value: "davet", label: "Davet bekliyor" },
  { value: "askida", label: "Askıda" },
  { value: "arsiv", label: "Arşivde" },
  { value: "parola", label: "Parola bekliyor" },
];

const STATUS_FILTERS = PARENT_STATUS_FILTERS;

export async function loadParentsPage(sp: { q?: string; durum?: string; sayfa?: string }) {

  const q = (sp.q ?? "").trim();
  const durum = STATUS_FILTERS.some((s) => s.value === sp.durum)
    ? (sp.durum ?? "")
    : "";
  const page = Math.max(1, Number.parseInt(sp.sayfa ?? "1", 10) || 1);

  const where: Prisma.UserWhereInput = {
    role: "PARENT",
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
          ],
        }
      : {}),
    ...(durum === "askida" ? { status: "SUSPENDED" as const } : {}),
    ...(durum === "arsiv" ? { status: "ARCHIVED" as const } : {}),
    ...(durum === "davet" ? { inviteAcceptedAt: null } : {}),
    ...(durum === "parola"
      ? { mustChangePassword: true, NOT: { inviteAcceptedAt: null } }
      : {}),
    ...(durum === "baglantisiz" ? { parentStudents: { none: {} } } : {}),
  };

  const [
    total,
    parents,
    withoutRelationshipCount,
    activeRelationships,
    relationshipHistory,
    studentOptions,
    parentOptions,
  ] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        status: true,
        inviteAcceptedAt: true,
        mustChangePassword: true,
        parentStudents: {
          select: {
            relationship: true,
            student: {
              select: { user: { select: { fullName: true, email: true } } },
            },
          },
          take: 3,
        },
      },
    }),
    prisma.user.count({
      where: {
        role: "PARENT",
        parentStudents: { none: {} },
      },
    }),
    prisma.parentStudent.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        parent: { select: { fullName: true, email: true } },
        student: {
          include: { user: { select: { fullName: true, email: true } } },
        },
      },
    }),
    prisma.parentStudentHistory.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        parent: { select: { fullName: true, email: true } },
        student: {
          include: { user: { select: { fullName: true, email: true } } },
        },
        actor: { select: { fullName: true, email: true } },
      },
    }),
    prisma.studentProfile.findMany({
      orderBy: { user: { fullName: "asc" } },
      take: 300,
      select: {
        id: true,
        user: { select: { fullName: true, email: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "PARENT", status: { in: ["ACTIVE", "SUSPENDED"] } },
      orderBy: { fullName: "asc" },
      take: 300,
      select: { id: true, fullName: true, email: true },
    }),
  ]);

  return { q, durum, page, total, parents, withoutRelationshipCount, activeRelationships, relationshipHistory, studentOptions, parentOptions };
}

export type ParentsPage = Awaited<ReturnType<typeof loadParentsPage>>;
