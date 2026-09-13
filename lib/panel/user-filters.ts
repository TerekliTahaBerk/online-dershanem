import type { Prisma, UserRole } from "@prisma/client";

export const ROLE_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Tümü" },
  { value: "STUDENT", label: "Öğrenci" },
  { value: "TEACHER", label: "Eğitmen" },
  { value: "PARENT", label: "Veli" },
  { value: "ADMIN", label: "Yönetici" },
];

export const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Tümü" },
  { value: "dikkat", label: "Dikkat gerekenler" },
  { value: "profil", label: "Profil eksik" },
  { value: "erisim-yok", label: "Erişim eksik" },
  { value: "davet", label: "Davet bekliyor" },
  { value: "askida", label: "Askıda" },
  { value: "arsiv", label: "Arşivde" },
  { value: "parola", label: "Parola bekliyor" },
];

export type UserListFilters = {
  q: string;
  rol: string;
  urun: string;
  durum: string;
};

export function parseUserListFilters(raw: {
  q?: string;
  rol?: string;
  urun?: string;
  durum?: string;
}): UserListFilters {
  return {
    q: (raw.q ?? "").trim(),
    rol: ROLE_FILTERS.some((role) => role.value === raw.rol) ? (raw.rol ?? "") : "",
    urun: ["OD", "OK", "ODK"].includes(raw.urun ?? "") ? (raw.urun ?? "") : "",
    durum: STATUS_FILTERS.some((status) => status.value === raw.durum) ? (raw.durum ?? "") : "",
  };
}

export function buildUserWhere(filters: UserListFilters): Prisma.UserWhereInput {
  const { q, rol, urun, durum } = filters;
  return {
    ...(rol ? { role: rol as UserRole } : {}),
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
          ],
        }
      : {}),
    ...(urun
      ? {
          productMemberships: {
            some: {
              product: urun as "OD" | "OK" | "ODK",
              revokedAt: null,
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
          },
        }
      : {}),
    ...(durum === "askida" ? { status: "SUSPENDED" as const } : {}),
    ...(durum === "arsiv" ? { status: "ARCHIVED" as const } : {}),
    ...(durum === "davet" ? { inviteAcceptedAt: null } : {}),
    ...(durum === "parola" ? { mustChangePassword: true, NOT: { inviteAcceptedAt: null } } : {}),
    ...(durum === "profil"
      ? {
          OR: [{ role: "STUDENT", studentProfile: null }, { role: "TEACHER", teacherProfile: null }],
        }
      : {}),
    ...(durum === "erisim-yok"
      ? {
          role: "STUDENT",
          NOT: {
            productMemberships: {
              some: {
                revokedAt: null,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
              },
            },
          },
        }
      : {}),
    ...(durum === "dikkat"
      ? { odOrders: { some: { status: "PAID", provisioningStatus: { not: "SUCCEEDED" } } } }
      : {}),
  };
}

