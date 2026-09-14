/**
 * Veri saklama politikası — TEK KAYNAK.
 *
 * Buradaki süreler hukuki karar DEĞİLDİR. Hukuk/veri sorumlusu bir süreyi
 * onaylayana kadar her kategori `PENDING_LEGAL_APPROVAL` kalır ve saklama
 * motoru o kategoride hiçbir kayda dokunmaz; yalnız "N kayıt onay bekliyor"
 * diye raporlar.
 *
 * Onay geldiğinde yapılacak değişiklik tek satırdır:
 *   retentionDays: 365, approvedBy: "<karar veren kişi/kurul>", approvedAt: "2026-10-01"
 * Sayısal bir süre `approvedBy` + `approvedAt` olmadan geçersizdir ve motor
 * kategoriyi `INVALID_POLICY` olarak atlar (bkz. validateRetentionCategory).
 *
 * Kaynak: docs/panel-data-governance.md → "Veri ve saklama matrisi".
 */

export const PENDING_LEGAL_APPROVAL = "PENDING_LEGAL_APPROVAL" as const;

/**
 * İşaretlenen kaydın kalıcı silinmeden önce beklediği süre. Bu bir SAKLAMA
 * süresi değil, yanlış tetiklenen silmeyi geri almak için teknik güvenlik
 * penceresidir; saklama süresine eklenir.
 */
export const RETENTION_GRACE_PERIOD_DAYS = 30;

export type RetentionEnforcement =
  /** Bu motor uygular (onaylı süre girilince). */
  | "RETENTION_ENGINE"
  /** Mevcut ayrı bir cron uygular; motor dokunmaz. */
  | "EXISTING_CRON"
  /** Yaşa değil olaya bağlı (ilişki bitişi, admin işlemi). */
  | "EVENT_DRIVEN"
  /** Mevzuat gereği saklanır; bu motorun kapsamı dışında. */
  | "LEGAL_HOLD"
  /** Veritabanı dışı (yedek artefaktları). */
  | "OUT_OF_DATABASE";

export type RetentionTarget = {
  /** Prisma model adı (PascalCase). */
  model: string;
  /** Kaydın yaşını belirleyen DateTime alanı. */
  dateField: string;
  /** Yalnız bu koşulu sağlayan kayıtlar süreye tabidir (ör. arşivli materyal). */
  where?: Record<string, unknown>;
  /** Kayıt silinmeden önce silinecek private Blob yolunu tutan alan. */
  blobField?: string;
};

export type RetentionCategory = {
  category: string;
  description: string;
  enforcement: RetentionEnforcement;
  targets: readonly RetentionTarget[];
  retentionDays: number | typeof PENDING_LEGAL_APPROVAL;
  approvedBy?: string;
  /** ISO tarih (YYYY-MM-DD). */
  approvedAt?: string;
  /** Dokümandaki öneri; motor bu değeri ASLA kullanmaz. */
  documentedSuggestion?: string;
  childData: boolean;
};

export const RETENTION_POLICY: readonly RetentionCategory[] = [
  {
    category: "academic-lesson-attendance-assignment",
    description: "Ders yoklaması ve ödev ilerlemesi",
    enforcement: "RETENTION_ENGINE",
    targets: [
      { model: "Attendance", dateField: "createdAt" },
      { model: "AssignmentProgress", dateField: "createdAt" },
    ],
    retentionDays: PENDING_LEGAL_APPROVAL,
    documentedSuggestion: "Sözleşme süresi + onaylı hukuki süre",
    childData: true,
  },
  {
    category: "learning-outcome-evidence",
    description: "Kazanım kanıtı ve ustalık özeti",
    enforcement: "RETENTION_ENGINE",
    targets: [
      { model: "StudentProgressEvidence", dateField: "createdAt" },
      { model: "StudentOutcomeMastery", dateField: "createdAt" },
    ],
    retentionDays: PENDING_LEGAL_APPROVAL,
    documentedSuggestion: "Bağlı ders/ödevle aynı süre",
    childData: true,
  },
  {
    category: "adaptive-weekly-plan",
    description: "Plan tercihi ve haftalık plan",
    enforcement: "RETENTION_ENGINE",
    targets: [
      { model: "WeeklyPlan", dateField: "createdAt" },
      { model: "StudentPlanPreference", dateField: "updatedAt" },
    ],
    retentionDays: PENDING_LEGAL_APPROVAL,
    documentedSuggestion: "Aktif eğitim ilişkisi + akademik kayıt süresi",
    childData: true,
  },
  {
    category: "calm-weekly-digest",
    description: "Haftalık özet ve yayın sürümü",
    enforcement: "RETENTION_ENGINE",
    targets: [{ model: "WeeklyDigest", dateField: "createdAt" }],
    retentionDays: PENDING_LEGAL_APPROVAL,
    documentedSuggestion: "Aktif eğitim ilişkisi + akademik kayıt süresi",
    childData: true,
  },
  {
    category: "intervention-case",
    description: "Müdahale vakası ve iç aksiyon notu",
    enforcement: "RETENTION_ENGINE",
    targets: [{ model: "InterventionCase", dateField: "createdAt" }],
    retentionDays: PENDING_LEGAL_APPROVAL,
    documentedSuggestion: "Aktif eğitim ilişkisi + onaylı operasyon/audit süresi",
    childData: true,
  },
  {
    category: "missed-lesson-recovery",
    description: "Telafi paketi ve mini kontrol",
    enforcement: "RETENTION_ENGINE",
    targets: [{ model: "RecoveryPackage", dateField: "createdAt" }],
    retentionDays: PENDING_LEGAL_APPROVAL,
    documentedSuggestion: "Bağlı ders/ödevle aynı akademik kayıt süresi",
    childData: true,
  },
  {
    category: "assignment-evidence",
    description: "Ödev kanıtı, rubric ve revizyon geçmişi",
    enforcement: "RETENTION_ENGINE",
    targets: [{ model: "AssignmentSubmission", dateField: "createdAt" }],
    retentionDays: PENDING_LEGAL_APPROVAL,
    documentedSuggestion: "Bağlı ödevle aynı akademik kayıt süresi",
    childData: true,
  },
  {
    category: "mock-exam-result",
    description: "Deneme sonucu, süre ve hata nedeni",
    enforcement: "RETENTION_ENGINE",
    targets: [{ model: "MockExam", dateField: "createdAt" }],
    retentionDays: PENDING_LEGAL_APPROVAL,
    documentedSuggestion: "Sözleşme süresi + onaylı hukuki süre",
    childData: true,
  },
  {
    category: "spaced-review",
    description: "Aralıklı tekrar öğesi ve çözüm notu",
    enforcement: "RETENTION_ENGINE",
    targets: [{ model: "ReviewItem", dateField: "createdAt" }],
    retentionDays: PENDING_LEGAL_APPROVAL,
    documentedSuggestion: "Bağlı akademik kanıtla aynı süre",
    childData: true,
  },
  {
    category: "teacher-note",
    description: "Öğretmen ortak/özel notu ve koç notu",
    enforcement: "RETENTION_ENGINE",
    targets: [
      { model: "LessonNote", dateField: "createdAt" },
      { model: "CoachNote", dateField: "createdAt" },
    ],
    retentionDays: PENDING_LEGAL_APPROVAL,
    documentedSuggestion: "Gerekli en kısa dönem",
    childData: true,
  },
  {
    category: "private-material-blob",
    description: "Arşivlenmiş private PDF/MP4 materyal ve Blob nesnesi",
    enforcement: "RETENTION_ENGINE",
    targets: [{ model: "LearningMaterial", dateField: "updatedAt", where: { isActive: false }, blobField: "blobPathname" }],
    retentionDays: PENDING_LEGAL_APPROVAL,
    documentedSuggestion: "Önce arşivle; onaylı bekleme sonrası Blob'u sil",
    childData: false,
  },
  {
    category: "notification",
    description: "Uygulama içi bildirim",
    enforcement: "RETENTION_ENGINE",
    targets: [{ model: "Notification", dateField: "createdAt" }],
    retentionDays: PENDING_LEGAL_APPROVAL,
    documentedSuggestion: "Öneri: 12 ay (onaylı değil)",
    childData: true,
  },
  {
    category: "audit-log",
    description: "Erişim ve değişiklik kanıtı",
    enforcement: "RETENTION_ENGINE",
    targets: [{ model: "AuditLog", dateField: "createdAt" }],
    retentionDays: PENDING_LEGAL_APPROVAL,
    documentedSuggestion: "Öneri: 24 ay (onaylı değil)",
    childData: false,
  },
  {
    category: "panel-session",
    description: "Oturum kaydı",
    enforcement: "EXISTING_CRON",
    targets: [{ model: "Session", dateField: "revokedAt" }],
    retentionDays: PENDING_LEGAL_APPROVAL,
    documentedSuggestion: "app/api/cron/panel-session-retention: süresi dolan + iptalden 30 gün sonra (teknik değer, hukuki onay kaydı yok)",
    childData: false,
  },
  {
    category: "product-event",
    description: "Kimliksiz ürün event'i",
    enforcement: "EXISTING_CRON",
    targets: [{ model: "ProductEvent", dateField: "occurredAt" }],
    retentionDays: PENDING_LEGAL_APPROVAL,
    documentedSuggestion: "app/api/cron/panel-session-retention: 90 gün (teknik değer, hukuki onay kaydı yok)",
    childData: false,
  },
  {
    category: "parent-student-link",
    description: "Veli–öğrenci ilişkisi",
    enforcement: "EVENT_DRIVEN",
    targets: [],
    retentionDays: PENDING_LEGAL_APPROVAL,
    documentedSuggestion: "İlişki sürdükçe; silme admin işlemiyle",
    childData: true,
  },
  {
    category: "group-enrollment",
    description: "Grup üyeliği",
    enforcement: "EVENT_DRIVEN",
    targets: [],
    retentionDays: PENDING_LEGAL_APPROVAL,
    documentedSuggestion: "Eğitim ilişkisi sürdükçe; `endedAt` ile kapanır",
    childData: true,
  },
  {
    category: "financial-record",
    description: "Sipariş, ödeme, fatura ve defter kayıtları",
    enforcement: "LEGAL_HOLD",
    targets: [],
    retentionDays: PENDING_LEGAL_APPROVAL,
    documentedSuggestion: "İlgili mevzuatın zorunlu süresi (mali müşavir onayı)",
    childData: false,
  },
  {
    category: "database-backup",
    description: "Şifreli veritabanı yedeği",
    enforcement: "OUT_OF_DATABASE",
    targets: [],
    retentionDays: PENDING_LEGAL_APPROVAL,
    documentedSuggestion: ".github/workflows/database-backup.yml artefakt retention-days: 14; restore sonrası tombstone yeniden uygulanır",
    childData: true,
  },
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RETENTION_DAYS = 36_500;

/** Boş dizi = uygulanabilir. Hata varsa motor kategoriye dokunmaz. */
export function validateRetentionCategory(category: RetentionCategory): string[] {
  const errors: string[] = [];
  if (category.enforcement === "RETENTION_ENGINE" && category.targets.length === 0) {
    errors.push("RETENTION_ENGINE kategorisi en az bir hedef model içermeli");
  }
  if (category.retentionDays === PENDING_LEGAL_APPROVAL) return errors;
  if (typeof category.retentionDays !== "number" || !Number.isInteger(category.retentionDays)
    || category.retentionDays < 1 || category.retentionDays > MAX_RETENTION_DAYS) {
    errors.push(`retentionDays 1–${MAX_RETENTION_DAYS} arası tam sayı ya da ${PENDING_LEGAL_APPROVAL} olmalı`);
  }
  if (!category.approvedBy?.trim()) errors.push("sayısal süre approvedBy olmadan geçersiz");
  if (!category.approvedAt || !ISO_DATE.test(category.approvedAt) || Number.isNaN(Date.parse(category.approvedAt))) {
    errors.push("sayısal süre geçerli approvedAt (YYYY-MM-DD) olmadan geçersiz");
  }
  return errors;
}

export function summarizeRetentionPolicy(policy: readonly RetentionCategory[] = RETENTION_POLICY) {
  const engine = policy.filter((category) => category.enforcement === "RETENTION_ENGINE");
  const approved = engine.filter((category) =>
    category.retentionDays !== PENDING_LEGAL_APPROVAL && validateRetentionCategory(category).length === 0);
  return {
    totalCategories: policy.length,
    engineCategories: engine.length,
    approvedEngineCategories: approved.length,
    pendingEngineCategories: engine.filter((category) => category.retentionDays === PENDING_LEGAL_APPROVAL).length,
    outsideEngineCategories: policy.length - engine.length,
  };
}

export function prismaDelegateName(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}
