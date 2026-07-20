export const STUDENT_CHECK_IN_WEEKLY_LIMIT = 2;
export const STUDENT_HELP_SLA_MS = 24 * 60 * 60 * 1000;

/** Pazartesi 00:00 Europe/Istanbul haftasını UTC olarak döndürür. */
export function studentCheckInWeekStart(now = new Date()): Date {
  const local = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const day = local.getUTCDay() || 7;
  const localMonday = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - day + 1);
  return new Date(localMonday - 3 * 60 * 60 * 1000);
}

export function studentCheckInWeekEnd(now = new Date()): Date {
  return new Date(studentCheckInWeekStart(now).getTime() + 7 * 24 * 60 * 60 * 1000);
}

export function studentHelpDueAt(now = new Date()): Date {
  return new Date(now.getTime() + STUDENT_HELP_SLA_MS);
}

export const checkInLabels = {
  energy: { LOW: "Enerjim düşük", STEADY: "İdare eder", GOOD: "Enerjim iyi" },
  confidence: { NEED_GUIDANCE: "Yönlendirmeye ihtiyacım var", BUILDING: "Yavaş yavaş oturuyor", CONFIDENT: "Kendime güveniyorum" },
  barrier: { NONE: "Belirgin bir engel yok", NOT_UNDERSTANDING: "Bir konuyu anlamıyorum", TIME_LOAD: "Çalışma yükünü yetiştiremiyorum", ACCESS_TECH: "Erişim veya cihaz sorunu var", NEED_EXAMPLE: "Bir örneğe daha ihtiyacım var", OTHER: "Başka bir çalışma engeli var" },
  action: { NEXT_LESSON: "Sonraki derste birlikte bakacağız", EXTRA_EXAMPLE: "Ek örnek hazırladım", PLAN_ADJUSTED: "Çalışma planını sadeleştirdim", SHORT_CHECKIN: "Kısa bir görüşme yapacağız", RESOURCE_SHARED: "Uygun bir kaynak paylaştım", NO_ACTION_NEEDED: "Şimdilik ek işlem gerekmiyor" },
} as const;
