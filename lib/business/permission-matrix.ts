/**
 * İşletme rol → izin matrisi (saf, sunucuya bağımsız).
 *
 * `permissions.ts` bu tabloyu sarmalar; buradaki hiçbir şey Prisma veya
 * `server-only` içermez, böylece matris doğrudan unit test edilebilir.
 * Erişim kararlarının TEK tanımı budur — UI görünürlüğü ve sunucu mutasyon
 * yetkisi aynı kaynaktan beslenir.
 */

export type BusinessRoleName =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "SALES"
  | "SUPPORT"
  | "ACCOUNTING"
  | "VIEWER";

export type BusinessPermission =
  | "dashboard:read"
  | "conversation:read"
  | "conversation:reply"
  | "lead:read"
  | "lead:write"
  | "campaign:read"
  | "campaign:write"
  | "finance:read"
  | "finance:write"
  | "finance:reverse"
  | "knowledge:read"
  | "knowledge:write"
  | "automation:read"
  | "automation:write"
  | "integration:read"
  | "integration:write"
  | "settings:read"
  | "settings:write"
  | "role:read"
  | "role:write"
  | "audit:read";

export const ALL_BUSINESS_PERMISSIONS: readonly BusinessPermission[] = [
  "dashboard:read",
  "conversation:read",
  "conversation:reply",
  "lead:read",
  "lead:write",
  "campaign:read",
  "campaign:write",
  "finance:read",
  "finance:write",
  "finance:reverse",
  "knowledge:read",
  "knowledge:write",
  "automation:read",
  "automation:write",
  "integration:read",
  "integration:write",
  "settings:read",
  "settings:write",
  "role:read",
  "role:write",
  "audit:read",
];

export const BUSINESS_ROLE_PERMISSIONS: Record<BusinessRoleName, readonly BusinessPermission[]> = {
  // Tüm iş birimleri; rol atama ve geri alınamaz finans işlemleri dahil.
  SUPER_ADMIN: ALL_BUSINESS_PERMISSIONS,

  // Atandığı iş biriminde operasyon ve finans yazma. Ters kayıt (finance:reverse),
  // dönem kilidi ve rol atama (role:write) bilinçli olarak SUPER_ADMIN'e özeldir.
  ADMIN: [
    "dashboard:read",
    "conversation:read",
    "conversation:reply",
    "lead:read",
    "lead:write",
    "campaign:read",
    "campaign:write",
    "finance:read",
    "finance:write",
    "knowledge:read",
    "knowledge:write",
    "automation:read",
    "automation:write",
    "integration:read",
    "integration:write",
    "settings:read",
    "settings:write",
    "role:read",
    "audit:read",
  ],

  // Satış: aday ve konuşma üzerinde çalışır. Finans ve entegrasyona yazamaz.
  SALES: [
    "dashboard:read",
    "conversation:read",
    "conversation:reply",
    "lead:read",
    "lead:write",
    "campaign:read",
  ],

  // Destek: konuşmayı yanıtlar, adayı yalnız okur. Satış aşaması yazamaz.
  SUPPORT: ["dashboard:read", "conversation:read", "conversation:reply", "lead:read"],

  // Muhasebe: finans defterinin sahibi. Konuşma ve aday PII'sine erişmez.
  ACCOUNTING: [
    "dashboard:read",
    "campaign:read",
    "finance:read",
    "finance:write",
    "finance:reverse",
    "audit:read",
  ],

  // İzleyici: yalnız okuma; hiçbir mutation izni yok.
  VIEWER: [
    "dashboard:read",
    "conversation:read",
    "lead:read",
    "campaign:read",
    "finance:read",
    "knowledge:read",
    "automation:read",
    "integration:read",
    "settings:read",
  ],
};

export function roleHasPermission(
  role: BusinessRoleName,
  permission: BusinessPermission,
): boolean {
  return BUSINESS_ROLE_PERMISSIONS[role].includes(permission);
}

/** Mutation izinleri — VIEWER hiçbirine sahip olmamalıdır. */
export const BUSINESS_WRITE_PERMISSIONS: readonly BusinessPermission[] = [
  "conversation:reply",
  "lead:write",
  "campaign:write",
  "finance:write",
  "finance:reverse",
  "knowledge:write",
  "automation:write",
  "integration:write",
  "settings:write",
  "role:write",
];
