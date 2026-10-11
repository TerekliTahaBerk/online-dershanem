/**
 * Müdahale kutusu sözlüğü — web (`components/panel/intervention-inbox.tsx`,
 * `intervention-create-form.tsx`) ve mobil yönetim ucu
 * (`/api/panel/admin/interventions`) AYNI etiketleri buradan okur.
 * Değerler sunucu şemalarıyla (`/api/panel/interventions/*`) birebir aynıdır.
 */

export const INTERVENTION_REASON_LABELS = {
  ATTENDANCE_PATTERN: "Katılım örüntüsü",
  OVERDUE_WORK: "Teslimi geçen çalışmalar",
  REPEATED_REVIEW_DIFFICULTY: "Tekrarlayan çözüm güçlüğü",
  PLAN_STALLED: "Plan kapasitesi",
  TEACHER_OBSERVED: "Öğretmen gözlemi",
} as const;

export const INTERVENTION_STATUS_LABELS = {
  OPEN: "Yeni",
  IN_PROGRESS: "İnceleniyor",
  SNOOZED: "Bekletildi",
  RESOLVED: "Çözüldü",
  FALSE_POSITIVE: "Yanlış işaret",
} as const;

export const INTERVENTION_OUTCOME_LABELS = {
  CHECK_IN_COMPLETED: "Öğrenciyle kısa görüşme yapıldı",
  SUPPORT_PLANNED: "Destek adımı planlandı",
  PRACTICE_ADJUSTED: "Çalışma yeniden düzenlendi",
  FAMILY_CONTACTED: "Aileyle iletişim kuruldu",
  NO_ACTION_NEEDED: "Ek işlem gerekmedi",
  OTHER: "Başka kontrollü sonuç",
} as const;

export const INTERVENTION_FALSE_POSITIVE_LABELS = {
  CONTEXT_MISSING: "Bağlam eksikti",
  DATA_OUTDATED: "Veri güncel değildi",
  THRESHOLD_TOO_SENSITIVE: "Eşik fazla hassastı",
  DUPLICATE: "Tekrarlayan kayıttı",
  OTHER: "Başka kontrollü neden",
} as const;

export const INTERVENTION_ACTIVITY_LABELS: Record<string, string> = {
  GENERATED: "Kural sinyali oluşturdu",
  ASSIGNED: "Sahiplenildi",
  STARTED: "İnceleme başladı",
  ACTION_LOGGED: "İnsan aksiyonu kaydedildi",
  SNOOZED: "Bekletildi",
  RESOLVED: "Çözüldü",
  FALSE_POSITIVE: "Yanlış işaret olarak kapandı",
  REOPENED: "Yeniden açıldı",
};

/** Elle kayıt formunun neden seçenekleri (sıra ve kısa etiketler web formuyla aynı). */
export const INTERVENTION_MANUAL_REASON_OPTIONS = [
  { value: "TEACHER_OBSERVED", label: "Gözlem / diğer" },
  { value: "ATTENDANCE_PATTERN", label: "Katılım" },
  { value: "OVERDUE_WORK", label: "Gecikmiş çalışma" },
  { value: "REPEATED_REVIEW_DIFFICULTY", label: "Tekrar güçlüğü" },
  { value: "PLAN_STALLED", label: "Plan geride" },
] as const;

/** Bekletme seçenekleri (`SNOOZE.days`); sunucu şeması 1 | 3 | 7. */
export const INTERVENTION_SNOOZE_DAYS = [1, 3, 7] as const;
