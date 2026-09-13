/**
 * Part 12 — Automation Rules: tetikleyici / koşul / aksiyon katalogu.
 * Serbest kod yok; yalnız allowlist değerler. UI etiketleri Türkçe.
 */

export const AUTOMATION_RULE_VERSION = "automation-rules-v1";

/** Event başına üst sınır (aksiyon dizisi). */
export const AUTOMATION_MAX_ACTIONS = 5;

/** Aynı kuralın saatte en fazla kaç canlı çalıştırma hakkı. */
export const AUTOMATION_RATE_LIMIT_PER_HOUR = 30;

/** Otomasyon aksiyonlarının yeniden otomasyon tetiklemesi engeli (derinlik). */
export const AUTOMATION_MAX_RECURSION_DEPTH = 1;

export const PART12_TRIGGERS = [
  "lead_created",
  "lead_stage_changed",
  "order_paid",
  "provisioning_failed",
  "student_invite_pending",
  "student_risk_created",
  "intervention_overdue",
  "lesson_missed",
  "assignment_overdue",
  "weekly_digest_ready",
] as const;

/** Instagram CRM uyumluluğu — mevcut kurallar kırılmasın. */
export const LEGACY_TRIGGERS = [
  "NEW_MESSAGE",
  "HOT_LEAD",
  "PAYMENT_COMPLETED",
  "COMPLAINT",
  "UNANSWERED_HOT_LEAD",
] as const;

export const AUTOMATION_TRIGGERS = [...PART12_TRIGGERS, ...LEGACY_TRIGGERS] as const;
export type AutomationTrigger = (typeof AUTOMATION_TRIGGERS)[number];

/** Eski tetikleyici → Part 12 eşdeğeri (eşleşme genişletmesi). */
export const TRIGGER_ALIASES: Partial<Record<AutomationTrigger, AutomationTrigger>> = {
  PAYMENT_COMPLETED: "order_paid",
  order_paid: "PAYMENT_COMPLETED",
};

export const AUTOMATION_TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  lead_created: "Lead oluşturuldu",
  lead_stage_changed: "Lead aşaması değişti",
  order_paid: "Sipariş ödendi",
  provisioning_failed: "Provisioning başarısız",
  student_invite_pending: "Öğrenci daveti bekliyor",
  student_risk_created: "Öğrenci riski oluştu",
  intervention_overdue: "Müdahale gecikti",
  lesson_missed: "Ders kaçırıldı",
  assignment_overdue: "Ödev gecikti",
  weekly_digest_ready: "Haftalık özet hazır",
  NEW_MESSAGE: "Yeni mesaj (Instagram)",
  HOT_LEAD: "Sıcak aday (Instagram)",
  PAYMENT_COMPLETED: "Ödeme tamamlandı (eski)",
  COMPLAINT: "Şikâyet (Instagram)",
  UNANSWERED_HOT_LEAD: "Cevapsız sıcak aday",
};

export const PART12_ACTIONS = [
  "create_task",
  "assign_owner",
  "send_internal_notification",
  "create_intervention",
  "send_approved_template_email",
  "add_tag",
] as const;

export const LEGACY_ACTIONS = [
  "SUGGEST_AI_REPLY",
  "ASSIGN_SALES",
  "MARK_WON",
  "NOTIFY_ADMIN",
  "ADD_TAG",
  "STOP_AI",
  "MARK_SPAM",
  "CREATE_TASK",
] as const;

export type Part12ActionType = (typeof PART12_ACTIONS)[number];
export type LegacyActionType = (typeof LEGACY_ACTIONS)[number];

export const AUTOMATION_ACTION_LABELS: Record<Part12ActionType | LegacyActionType, string> = {
  create_task: "Görev oluştur",
  assign_owner: "Sahip ata",
  send_internal_notification: "İç bildirim gönder",
  create_intervention: "Müdahale oluştur",
  send_approved_template_email: "Onaylı şablon e-posta",
  add_tag: "Etiket ekle",
  SUGGEST_AI_REPLY: "AI yanıt öner",
  ASSIGN_SALES: "Satış ata",
  MARK_WON: "Kazanıldı işaretle",
  NOTIFY_ADMIN: "Admin bilgilendir",
  ADD_TAG: "Etiket ekle (eski)",
  STOP_AI: "AI durdur",
  MARK_SPAM: "Spam işaretle",
  CREATE_TASK: "Görev oluştur (eski)",
};

/** Yalnız allowlist şablon anahtarları — dış sisteme serbest içerik yok. */
export const APPROVED_EMAIL_TEMPLATES = [
  "automation_ops_alert",
  "automation_invite_reminder",
  "automation_intervention_alert",
] as const;

export type ApprovedEmailTemplate = (typeof APPROVED_EMAIL_TEMPLATES)[number];

export const APPROVED_EMAIL_TEMPLATE_LABELS: Record<ApprovedEmailTemplate, string> = {
  automation_ops_alert: "Operasyon uyarısı (iç)",
  automation_invite_reminder: "Davet hatırlatması (iç)",
  automation_intervention_alert: "Müdahale uyarısı (iç)",
};

export const SEVERITY_VALUES = ["low", "medium", "high"] as const;
export type AutomationSeverity = (typeof SEVERITY_VALUES)[number];
