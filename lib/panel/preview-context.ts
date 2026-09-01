import type { UserRole, UserStatus } from "@prisma/client";

/**
 * Admin panel önizleme (View As) — sunum bağlamı.
 *
 * Bu tip authorization kararı değildir. Gerçek oturum her zaman ADMIN kalır;
 * preview yalnızca hangi paneli / hangi subject verisini göstereceğini taşır.
 */

export const ADMIN_PREVIEW_PERMISSION = "admin:preview_panel" as const;

export const PREVIEWABLE_ROLES = ["STUDENT", "PARENT", "TEACHER"] as const;
export type PreviewableRole = (typeof PREVIEWABLE_ROLES)[number];

export type PanelPreviewContext =
  | { enabled: false }
  | {
      enabled: true;
      previewRole: PreviewableRole;
      previewUserId: string;
      startedByAdminId: string;
      startedAt: string;
      returnPath: string | null;
      expiresAt: string;
    };

export type PanelActorContext = {
  /** Gerçek kimlik — her zaman oturumdaki kullanıcı (ADMIN). */
  actor: {
    userId: string;
    role: UserRole;
    email: string;
    fullName: string | null;
    sessionId: string;
  };
  preview?: {
    role: PreviewableRole;
    userId: string;
  };
};

export type PreviewSubjectNotice =
  | "ARCHIVED"
  | "SUSPENDED"
  | "INVITE_PENDING"
  | "MUST_CHANGE_PASSWORD"
  | "NO_PARENT_CHILDREN"
  | "NO_TEACHER_ASSIGNMENT";

export type PreviewSubject = {
  userId: string;
  role: PreviewableRole;
  email: string;
  fullName: string | null;
  status: UserStatus;
  notices: PreviewSubjectNotice[];
};

export function isPreviewableRole(role: string): role is PreviewableRole {
  return (PREVIEWABLE_ROLES as readonly string[]).includes(role);
}

export function previewRoleLabel(role: PreviewableRole): string {
  const labels: Record<PreviewableRole, string> = {
    STUDENT: "öğrenci",
    PARENT: "veli",
    TEACHER: "öğretmen",
  };
  return labels[role];
}

export function previewBannerCopy(input: {
  role: PreviewableRole;
  subjectName: string;
}): { title: string; body: string; switchLabel: string; ctaLabel: string } {
  const name = input.subjectName.trim() || "seçili kullanıcı";
  if (input.role === "STUDENT") {
    return {
      title: "Yönetici Önizlemesi",
      body: `${name} adlı öğrencinin panelini görüntülüyorsunuz.`,
      switchLabel: "Öğrenciyi Değiştir",
      ctaLabel: "Öğrenci görünümünü aç",
    };
  }
  if (input.role === "PARENT") {
    return {
      title: "Yönetici Önizlemesi",
      body: `${name} adlı velinin panelini görüntülüyorsunuz.`,
      switchLabel: "Veliyi Değiştir",
      ctaLabel: "Veli görünümünü aç",
    };
  }
  return {
    title: "Yönetici Önizlemesi",
    body: `${name} adlı öğretmenin gördüğü paneli görüntülüyorsunuz.`,
    switchLabel: "Öğretmeni Değiştir",
    ctaLabel: "Öğretmen görünümünü aç",
  };
}

export function previewNoticeMessage(notice: PreviewSubjectNotice): string {
  switch (notice) {
    case "ARCHIVED":
      return "Bu kullanıcı arşivlenmiş durumda.";
    case "SUSPENDED":
      return "Bu kullanıcı askıya alınmış durumda.";
    case "INVITE_PENDING":
      return "Bu kullanıcı davetini henüz kabul etmedi.";
    case "MUST_CHANGE_PASSWORD":
      return "Bu kullanıcı henüz geçici parolasını değiştirmedi.";
    case "NO_PARENT_CHILDREN":
      return "Bu velinin bağlı öğrencisi yok.";
    case "NO_TEACHER_ASSIGNMENT":
      return "Bu öğretmene atanmış aktif grup bulunamadı.";
  }
}

/** İstemci event'leri gerçek ürün metriklerine yazılmamalı. */
export function adminPreviewPageViewEvent(input: {
  previewRole: PreviewableRole;
  path: string;
}) {
  return {
    name: "admin_preview_page_viewed" as const,
    properties: {
      previewRole: input.previewRole,
      pathBand: pathBand(input.path),
    },
  };
}

function pathBand(path: string): string {
  const cleaned = path.split("?")[0] ?? path;
  if (cleaned.startsWith("/panel/ogrenci")) return "STUDENT_PANEL";
  if (cleaned.startsWith("/panel/veli")) return "PARENT_PANEL";
  if (cleaned.startsWith("/panel/ogretmen")) return "TEACHER_PANEL";
  if (cleaned.startsWith("/panel/odk")) return "ODK_PANEL";
  return "OTHER";
}
