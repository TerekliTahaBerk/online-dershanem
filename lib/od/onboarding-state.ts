export const OD_ONBOARDING_STATES = [
  "PAID",
  "CONTACT_PENDING",
  "CONTACTED",
  "ACCOUNT_READY",
  "PARENT_LINKED",
  "PLACEMENT_PENDING",
  "GROUP_ASSIGNED",
  "FIRST_LESSON_SCHEDULED",
  "ACTIVE",
  "MANUAL_REVIEW",
  "BLOCKED",
  "REFUND_PENDING",
  "CANCELED",
] as const;

export type OdOnboardingStateValue = (typeof OD_ONBOARDING_STATES)[number];

export const OD_ONBOARDING_LABELS: Record<OdOnboardingStateValue, string> = {
  PAID: "Ödeme alındı",
  CONTACT_PENDING: "İletişim bekliyor",
  CONTACTED: "İletişim kuruldu",
  ACCOUNT_READY: "Hesap hazır",
  PARENT_LINKED: "Veli bağlandı",
  PLACEMENT_PENDING: "Yerleştirme bekliyor",
  GROUP_ASSIGNED: "Grup atandı",
  FIRST_LESSON_SCHEDULED: "İlk ders planlandı",
  ACTIVE: "Aktif",
  MANUAL_REVIEW: "Manuel inceleme",
  BLOCKED: "Bloke",
  REFUND_PENDING: "İade bekliyor",
  CANCELED: "İptal edildi",
};

const NORMAL_NEXT: Partial<Record<OdOnboardingStateValue, OdOnboardingStateValue>> = {
  PAID: "CONTACT_PENDING",
  CONTACT_PENDING: "CONTACTED",
  CONTACTED: "ACCOUNT_READY",
  ACCOUNT_READY: "PARENT_LINKED",
  PARENT_LINKED: "PLACEMENT_PENDING",
  PLACEMENT_PENDING: "GROUP_ASSIGNED",
  GROUP_ASSIGNED: "FIRST_LESSON_SCHEDULED",
  FIRST_LESSON_SCHEDULED: "ACTIVE",
};

const SLA_HOURS: Partial<Record<OdOnboardingStateValue, number>> = {
  PAID: 4,
  CONTACT_PENDING: 24,
  CONTACTED: 24,
  ACCOUNT_READY: 24,
  PARENT_LINKED: 24,
  PLACEMENT_PENDING: 48,
  GROUP_ASSIGNED: 72,
  FIRST_LESSON_SCHEDULED: 24,
  MANUAL_REVIEW: 24,
  BLOCKED: 24,
  REFUND_PENDING: 48,
};

export const OD_ONBOARDING_NEXT_ACTION: Record<OdOnboardingStateValue, string> = {
  PAID: "İletişim sorumlusunu belirle",
  CONTACT_PENDING: "Öğrenci veya veliyle iletişim kur",
  CONTACTED: "Öğrenci hesabını hazırla veya mevcut hesabı bağla",
  ACCOUNT_READY: "Veli hesabını öğrenciye bağla",
  PARENT_LINKED: "Seviye ve yerleştirme bilgilerini doğrula",
  PLACEMENT_PENDING: "Öğrenciyi uygun gruba ata",
  GROUP_ASSIGNED: "İlk dersi takvime ekle",
  FIRST_LESSON_SCHEDULED: "Erişimi aktive edip onboarding'i tamamla",
  ACTIVE: "Onboarding tamamlandı",
  MANUAL_REVIEW: "Kimlik çakışmasını incele veya öğrenci hesabını elle seç",
  BLOCKED: "Blokeri çöz ve önceki adıma dön",
  REFUND_PENDING: "Ödeme iadesinin tamamlanmasını takip et",
  CANCELED: "İşlem kapatıldı",
};

const TERMINAL = new Set<OdOnboardingStateValue>(["ACTIVE", "CANCELED"]);

export function allowedOdOnboardingTransitions(
  state: OdOnboardingStateValue,
  blockedFromState?: OdOnboardingStateValue | null,
): OdOnboardingStateValue[] {
  if (TERMINAL.has(state)) return state === "ACTIVE" ? ["REFUND_PENDING"] : [];
  if (state === "MANUAL_REVIEW") return blockedFromState ? [blockedFromState, "BLOCKED", "REFUND_PENDING", "CANCELED"] : ["BLOCKED", "REFUND_PENDING", "CANCELED"];
  if (state === "BLOCKED") return blockedFromState ? [blockedFromState, "REFUND_PENDING", "CANCELED"] : ["REFUND_PENDING", "CANCELED"];
  if (state === "REFUND_PENDING") return ["CANCELED", "BLOCKED"];
  const next = NORMAL_NEXT[state];
  return [...(next ? [next] : []), "BLOCKED", "REFUND_PENDING", "CANCELED"];
}

export function dueAtForOdOnboardingState(state: OdOnboardingStateValue, enteredAt = new Date()): Date | null {
  const hours = SLA_HOURS[state];
  return hours ? new Date(enteredAt.getTime() + hours * 60 * 60 * 1000) : null;
}

export type OdOnboardingReadiness = {
  hasStudentAccount: boolean;
  hasParentLink: boolean;
  hasGroupAssignment: boolean;
  hasFirstLesson: boolean;
};

export function validateOdOnboardingPrerequisite(
  toState: OdOnboardingStateValue,
  readiness: OdOnboardingReadiness,
): string | null {
  if (["ACCOUNT_READY", "PARENT_LINKED", "PLACEMENT_PENDING", "GROUP_ASSIGNED", "FIRST_LESSON_SCHEDULED", "ACTIVE"].includes(toState) && !readiness.hasStudentAccount) {
    return "Sipariş aktif bir öğrenci hesabına bağlı değil.";
  }
  if (["PARENT_LINKED", "PLACEMENT_PENDING", "GROUP_ASSIGNED", "FIRST_LESSON_SCHEDULED", "ACTIVE"].includes(toState) && !readiness.hasParentLink) {
    return "Öğrenci hesabında veli bağlantısı eksik.";
  }
  if (["GROUP_ASSIGNED", "FIRST_LESSON_SCHEDULED", "ACTIVE"].includes(toState) && !readiness.hasGroupAssignment) {
    return "Öğrencinin aktif grup ataması eksik.";
  }
  if (["FIRST_LESSON_SCHEDULED", "ACTIVE"].includes(toState) && !readiness.hasFirstLesson) {
    return "Atanan grup için planlanmış ilk ders bulunmuyor.";
  }
  return null;
}
