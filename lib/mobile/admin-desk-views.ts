import { MOBILE_ADMIN_CONTRACT_VERSION, type MobileActivationDesk } from "@/lib/mobile-contracts/admin";
import { OD_ONBOARDING_LABELS, OD_ONBOARDING_NEXT_ACTION, allowedOdOnboardingTransitions } from "@/lib/od/onboarding-state";
import { OD_NO_SLOT_OPTIONS, OD_TIME_RANGE_OPTIONS } from "@/lib/od/placement";
import type { ActivationDesk } from "@/lib/panel/activation-desk-server";
import {
  CRON_STATUS_LABELS,
  EMAIL_OUTBOX_DROPPED_LABEL,
  EMAIL_OUTBOX_STATUS_LABELS,
  LEAD_INTAKE_STATUS_LABELS,
  ORDER_PAYMENT_STATUS_PRESENTATION,
  READINESS_STATUS_PRESENTATION,
} from "@/lib/panel/status-vocabulary";
import { toPanelPath } from "./admin-views";

/**
 * Aktivasyon masası mobil projeksiyonu (Faz 2.1). Web sayfasının gösterdiği
 * alanların aynısı; durum etiketleri ve izinli geçişler sunucuda hesaplanır.
 * Sipariş tutarı yalnız yönetim arka ofisi bilgisidir (satış akışı değil).
 */

const CRITICAL_STATES = new Set(["BLOCKED", "MANUAL_REVIEW", "REFUND_PENDING"]);
const money = (cents: number) => `${(cents / 100).toLocaleString("tr-TR")} ₺`;
const nameOf = (user: { fullName: string | null; email: string } | null | undefined) => (user ? user.fullName || user.email : null);

type Preferences = { timeRanges?: string[]; earliestStartDate?: string | null; noSlotPreference?: string } | undefined;

function preferenceText(buyerInfo: unknown): string | null {
  const preferences = ((buyerInfo ?? {}) as { placementPreferences?: Preferences }).placementPreferences;
  if (!preferences) return null;
  const ranges = (preferences.timeRanges || []).map((value) => OD_TIME_RANGE_OPTIONS.find((option) => option.value === value)?.label || value).join(" · ") || "Belirtilmedi";
  const noSlot = OD_NO_SLOT_OPTIONS.find((option) => option.value === preferences.noSlotPreference)?.label || preferences.noSlotPreference || "iletişim";
  return `Müsaitlik: ${ranges} · En erken: ${preferences.earliestStartDate || "hemen"} · Slot yoksa: ${noSlot}`;
}

export function toMobileActivationDesk(desk: ActivationDesk): MobileActivationDesk {
  const { now, firstLessonMetrics: lesson, placementMetrics: placement } = desk;
  return {
    contractVersion: MOBILE_ADMIN_CONTRACT_VERSION,
    counts: { activations: desk.onboardingQueue.length, openExceptions: desk.openUnifiedOperations.length, emailQueue: desk.emailQueue.length },
    firstLesson: {
      medianHours: lesson.duration.value === null ? null : Math.round((lesson.duration.value / 3_600_000) * 10) / 10,
      durationSample: lesson.duration.sampleSize,
      participationRate: lesson.participation.value,
      participationSample: lesson.participation.sampleSize,
      waitingCount: lesson.waitingCount,
      missingAttendanceCount: lesson.missingAttendanceCount,
      paidCount: lesson.paidCount,
      linkedLeadCount: lesson.linkedLeadCount,
    },
    placement: {
      firstContactHours: placement.firstContactHours,
      firstContactSample: placement.firstContactSample,
      placementHours: placement.placementHours,
      placementSample: placement.placementSample,
      noSlotRate: placement.noSlotRate,
      onboardingCount: placement.onboardingCount,
      outcomes: placement.outcomes,
    },
    onboardings: desk.onboardingQueue.map((item) => {
      const profile = item.order.user?.studentProfile;
      const hasLesson = Boolean(profile?.enrollments.some((enrollment) => enrollment.group.lessons.length));
      return {
        id: item.id,
        orderId: item.orderId,
        state: item.state,
        stateLabel: OD_ONBOARDING_LABELS[item.state],
        critical: CRITICAL_STATES.has(item.state),
        flowLabel: item.flowType === "EXISTING_STUDENT" ? "Mevcut öğrenci" : "Yeni öğrenci",
        nextAction: OD_ONBOARDING_NEXT_ACTION[item.state],
        packageName: item.order.packageName,
        customer: nameOf(item.order.user) ?? "Henüz hesaba bağlanmadı",
        linkedToAccount: Boolean(item.order.userId),
        totalLabel: money(item.order.totalCents),
        ownerId: item.ownerId,
        ownerName: nameOf(item.owner),
        dueAt: item.dueAt ? item.dueAt.toISOString() : null,
        overdue: Boolean(item.dueAt && item.dueAt < now),
        stateEnteredAt: item.stateEnteredAt.toISOString(),
        preferences: preferenceText(item.order.buyerInfo),
        checklist: [
          { key: "account", label: "Hesap", done: Boolean(profile) },
          { key: "parent", label: "Veli", done: Boolean(profile?.parents.length) },
          { key: "group", label: "Grup", done: Boolean(profile?.enrollments.length) },
          { key: "lesson", label: "İlk ders", done: hasLesson },
        ],
        blockerReason: item.blockerReason,
        allowedTransitions: allowedOdOnboardingTransitions(item.state, item.blockedFromState).map((state) => ({ value: state, label: OD_ONBOARDING_LABELS[state] })),
        transitions: item.transitions.map((transition) => ({
          id: transition.id,
          occurredAt: transition.occurredAt.toISOString(),
          text: [
            `${transition.fromState ? `${OD_ONBOARDING_LABELS[transition.fromState]} → ` : ""}${OD_ONBOARDING_LABELS[transition.toState]}`,
            nameOf(transition.actor) ?? "Sistem",
            transition.note,
          ].filter(Boolean).join(" · "),
        })),
      };
    }),
    exceptions: desk.unifiedOperations.slice(0, 40).map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.detail,
      severity: item.severity,
      resolved: item.resolution !== "OPEN",
      owner: item.owner,
      nextAction: item.nextAction,
      dueAt: item.dueAt ? item.dueAt.toISOString() : null,
      overdue: Boolean(item.dueAt && item.dueAt < now && item.resolution === "OPEN"),
      createdAt: item.createdAt.toISOString(),
      ctaLabel: item.ctaLabel,
      webPath: toPanelPath(item.href),
    })),
    readiness: {
      status: desk.readinessStatus,
      statusLabel: READINESS_STATUS_PRESENTATION[desk.readinessStatus].label,
      rows: desk.readinessRows.map((row) => ({ ...row, statusLabel: READINESS_STATUS_PRESENTATION[row.status].label })),
    },
    orders: desk.orders.map((order) => ({
      id: order.id,
      packageName: order.packageName,
      customer: nameOf(order.user) ?? "Henüz hesaba bağlanmadı",
      linkedToAccount: Boolean(order.userId),
      status: order.status,
      statusLabel: ORDER_PAYMENT_STATUS_PRESENTATION[order.status].label,
      paid: order.status === "PAID",
      totalLabel: money(order.totalCents),
    })),
    leads: desk.leads.map((lead) => ({ id: lead.id, fullName: lead.fullName, detail: [lead.phone, lead.examType, lead.targetGoal].filter(Boolean).join(" · "), status: lead.intakeStatus })),
    leadStatuses: Object.entries(LEAD_INTAKE_STATUS_LABELS).map(([value, label]) => ({ value, label })),
    cron: {
      ok: desk.cronHealth.ok,
      jobs: desk.cronHealth.jobs.map((job) => ({
        name: job.name,
        label: job.label,
        status: job.status,
        statusLabel: CRON_STATUS_LABELS[job.status],
        lastSucceededAt: job.lastSucceededAt,
        lastDurationMs: job.lastDurationMs,
        processedCount: job.processedCount,
        failedCount: job.failedCount,
        errorCode: job.errorCode,
      })),
    },
    emails: desk.emailQueue.map((email) => ({
      id: email.id,
      subject: email.subject,
      status: email.status,
      statusLabel: EMAIL_OUTBOX_STATUS_LABELS[email.status] ?? EMAIL_OUTBOX_DROPPED_LABEL,
      attempts: email.attempts,
      createdAt: email.createdAt.toISOString(),
      retryable: email.status !== "PENDING",
    })),
    students: desk.students,
    staff: desk.staff,
  };
}
