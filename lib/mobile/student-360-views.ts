import type { AssignmentProgressStatus } from "@prisma/client";
import { MOBILE_ADMIN_CONTRACT_VERSION, type MobileStudent360, type MobileStudentCard } from "@/lib/mobile-contracts/admin";
import { ASSIGNMENT_DISPLAY_LABELS, deriveAssignmentDisplayStatus } from "@/lib/panel/assignment-display";
import {
  STUDENT_360_ATTENDANCE_LABELS,
  STUDENT_360_GROUP_LABELS,
  STUDENT_360_PACKAGE_STATUS_LABELS,
  STUDENT_360_RISK_LEVEL_LABELS,
  STUDENT_360_TAB_LABELS,
  STUDENT_360_LEARNING_VIEWS,
  type Student360RiskLevel,
} from "@/lib/panel/student-360";
import type { Student360Bundle } from "@/lib/panel/student-360/dto";

/**
 * ÖĞRENCİ 360 mobil projeksiyonu (Faz 2.2). Web panelleriyle
 * (`components/panel/student-360/*`) AYNI veri ve etiketler; her bölüm
 * sunucuda karta çevrilir. İş kuralı (risk, paket durumu, ödev görünüm
 * durumu) mevcut saf fonksiyonlardan gelir, istemcide hesaplanmaz.
 */

type Tone = "neutral" | "info" | "success" | "warning" | "critical";
type Row = MobileStudentCard["rows"][number];
type Metric = MobileStudentCard["metrics"][number];

const DATE = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
const DAY = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", timeZone: "Europe/Istanbul" });

const riskTone = (level: Student360RiskLevel): Tone => (level === "high" ? "critical" : level === "medium" || level === "low" ? "warning" : "success");
const packageTone = (status: Student360Bundle["summary"]["packageStatus"]): Tone => (status === "active" ? "success" : status === "none" ? "neutral" : "warning");
const metric = (label: string, value: string, hint: string | null = null, tone: Tone = "neutral"): Metric => ({ label, value, hint, tone });
const row = (title: string, subtitle: string | null = null, meta: string | null = null, badge: Row["badge"] = null): Row => ({ title, subtitle, meta, badge });
const card = (id: string, title: string, parts: { metrics?: Metric[]; rows?: Row[]; empty?: string }): MobileStudentCard => ({
  id,
  title,
  metrics: parts.metrics ?? [],
  rows: parts.rows ?? [],
  empty: (parts.rows ?? []).length || (parts.metrics ?? []).length ? null : parts.empty ?? "Kayıt yok.",
});

function cardsFor(bundle: Student360Bundle, now: Date): MobileStudent360["cards"] {
  const cards: MobileStudent360["cards"] = [];
  const o = bundle.overview;
  if (o) {
    cards.push(
      card("overview", "Genel bakış", {
        metrics: [
          metric("Bu hafta katılım", `${o.weekAttendancePresent}/${o.weekAttendanceTotal}`),
          metric("Ödev", `${o.completedAssignments}/${o.assignmentTotal}`),
          metric("Plan tamamlama", o.planCompletionPercent === null ? "—" : `%${o.planCompletionPercent}`),
          metric("Açık yardım talebi", String(o.openHelpRequests), null, o.openHelpRequests ? "warning" : "neutral"),
        ],
        rows: [
          ...o.activeRiskReasons.map((reason) => row(reason, "Risk nedeni", null, { label: "Risk", tone: "warning" })),
          ...o.upcomingLessons.map((lesson) => row(lesson.title, DATE.format(lesson.startsAt), null, { label: "Ders", tone: "info" })),
          ...o.openInterventions.map((item) => row(item.reason, `Son: ${DATE.format(item.dueAt)}`, item.status, { label: "Müdahale", tone: "warning" })),
          ...o.recentExams.map((exam) => row(exam.title, DAY.format(exam.takenAt), `${exam.totalNet} net`)),
          ...(o.nearestOdkExamTitle ? [row(o.nearestOdkExamTitle, "Yaklaşan Deneme Ligi denemesi")] : []),
        ],
      }),
    );
  }
  const a = bundle.academic;
  if (a) {
    cards.push(
      card("academic", "Gelişim", {
        metrics: [metric("Tekrar bekleyen", String(a.reviewDueCount)), metric("Kanıt", String(a.evidenceCount))],
        rows: [
          ...a.subjectPerformance.map((item) => row(item.subject, item.avgNet === null ? "Veri yok" : `Ortalama ${item.avgNet} net`, `${item.sampleSize} örnek`)),
          ...a.unifiedOutcomes.map((item) => row(`${item.code} · ${item.title}`, `${item.subjectName} · ${item.unitName}`, item.explanation.map((part) => part.detail).join(" · ") || null, { label: item.statusLabel, tone: "neutral" })),
          ...a.outcomeHints.map((hint) => row(hint.title, `${hint.subject} · ${hint.type}`)),
        ],
        empty: "Kazanım ve ders performansı verisi yok.",
      }),
    );
  }
  const l = bundle.lessons;
  if (l) {
    cards.push(
      card("lessons", "Dersler", {
        metrics: [metric("Açık telafi", String(l.recoveryOpenCount), null, l.recoveryOpenCount ? "warning" : "neutral")],
        rows: [
          ...l.upcoming.map((lesson) => row(lesson.title, `${lesson.groupName} · ${DATE.format(lesson.startsAt)}`, null, { label: "Yaklaşan", tone: "info" })),
          ...l.past.map((lesson) =>
            row(lesson.title, `${DATE.format(lesson.startsAt)}${lesson.attendance ? ` · ${STUDENT_360_ATTENDANCE_LABELS[lesson.attendance] ?? lesson.attendance}` : ""}`, lesson.note, null),
          ),
        ],
      }),
    );
  }
  const as = bundle.assignmentsTab;
  if (as) {
    cards.push(
      card("assignments", "Ödevler", {
        rows: as.items.map((item) => {
          const display = deriveAssignmentDisplayStatus({ progress: item.status as AssignmentProgressStatus, dueAt: item.dueAt ?? new Date(0), now });
          return row(item.title, `${item.groupName}${item.dueAt ? ` · ${DATE.format(item.dueAt)}` : ""}`, null, { label: ASSIGNMENT_DISPLAY_LABELS[display], tone: display === "GEC" ? "critical" : "neutral" });
        }),
        empty: "Ödev yok.",
      }),
    );
  }
  const t = bundle.teachersTab;
  if (t) cards.push(card("teachers", "Öğretmenler", { rows: t.links.map((link) => row(link.teacherName, link.subject, `${DAY.format(link.startedAt)} itibarıyla`)), empty: "Branş öğretmeni bağlantısı yok." }));
  const c = bundle.coaching;
  if (c) {
    cards.push(
      card("coaching", "Koçluk", {
        metrics: [
          metric("Koç", c.coachName ?? "Atanmadı"),
          metric("Görüşme sıklığı", c.cadenceDays ? `${c.cadenceDays} günde bir` : "—", c.overdue ? "Görüşme gecikti" : null, c.overdue ? "warning" : "neutral"),
          ...(c.plan ? [metric("Plan", c.plan.completionPercent === null ? "—" : `%${c.plan.completionPercent}`, `${DAY.format(c.plan.weekStart)} haftası · ${c.plan.status}`)] : []),
        ],
        rows: [
          ...(c.focus ? [row("Odak", c.focus)] : []),
          ...(c.sharedNote ? [row("Paylaşılan not", c.sharedNote)] : []),
          ...(c.feedbackCategory ? [row("Geri bildirim", c.feedbackCategory)] : []),
          ...c.goals.map((goal) => row(goal.label, `Hedef ${goal.target}${goal.current === null ? "" : ` · şu an ${goal.current}`}`, null, { label: "Hedef", tone: "info" })),
          ...(c.plan?.tasks ?? []).map((task) => row(task.title, DATE.format(task.scheduledFor), null, { label: task.status, tone: task.status === "DONE" ? "success" : "neutral" })),
          ...c.checkIns.map((checkIn) => row(`Check-in · ${DATE.format(checkIn.createdAt)}`, `Enerji ${checkIn.energy} · Engel ${checkIn.barrier}`, checkIn.shared ? "Paylaşıldı" : null)),
          ...c.timeline.map((entry) => row(entry.title, entry.summary, DATE.format(entry.occurredAt))),
        ],
      }),
    );
  }
  const e = bundle.exams;
  if (e) {
    cards.push(
      card("exams", "Denemeler", {
        metrics: [metric("Net değişimi", e.netDelta === null ? "—" : `${e.netDelta > 0 ? "+" : ""}${e.netDelta}`, null, e.netDelta !== null && e.netDelta < 0 ? "warning" : "neutral")],
        rows: [
          ...e.recent.map((exam) => row(exam.exam, `${DAY.format(exam.takenAt)} · ${exam.totalNet} net`, exam.sections.map((section) => `${section.subject} ${section.net}`).join(" · ") || null)),
          ...e.subjectDeltas.map((item) => row(item.subject, item.delta === null ? "Karşılaştırma yok" : `${item.delta > 0 ? "+" : ""}${item.delta} net`)),
          ...e.recurringGaps.map((gap) => row(gap, "Tekrarlayan eksik", null, { label: "Eksik", tone: "warning" })),
        ],
        empty: "Deneme kaydı yok.",
      }),
    );
  }
  const r = bundle.riskTab;
  if (r) {
    cards.push(
      card("risk", "Risk ve müdahale", {
        metrics: [metric("Risk", STUDENT_360_RISK_LEVEL_LABELS[r.summary.level], `${r.summary.totalPoints} puan`, riskTone(r.summary.level))],
        rows: [
          ...r.summary.items.map((item) => row(item.reason, item.suggestedAction, [item.ownerName, item.status].filter(Boolean).join(" · ") || null, { label: `${item.points} puan`, tone: item.severity === "high" ? "critical" : item.severity === "medium" ? "warning" : "neutral" })),
          ...r.cases.map((item) => row(item.explanation, item.suggestedAction, `${item.ownerName ?? "Sahipsiz"} · son ${DATE.format(item.dueAt)}`, { label: item.status, tone: "warning" })),
        ],
        empty: "Açık risk veya müdahale yok.",
      }),
    );
  }
  const p = bundle.parent;
  if (p) {
    cards.push(
      card("parent", "Veliler", {
        rows: [
          ...p.parents.map((parent) => row(parent.fullName, `${parent.relationship ?? "Veli"} · ${parent.email}`)),
          ...p.digests.map((digest) => row(`Haftalık özet · ${DAY.format(digest.weekStart)}`, `${digest.trendBand} · ${digest.supportArea}`, digest.publishedAt ? `Yayın ${DATE.format(digest.publishedAt)}` : null, { label: digest.status, tone: "neutral" })),
        ],
        empty: "Bağlı veli yok.",
      }),
    );
  }
  const m = bundle.commerce;
  if (m) {
    cards.push(
      card("commerce", "Hesap ve paket", {
        metrics: [metric("Paket durumu", STUDENT_360_PACKAGE_STATUS_LABELS[m.packageStatus], null, packageTone(m.packageStatus))],
        rows: [
          ...m.memberships.map((membership) => row(membership.label, membership.expiresAt ? `${DAY.format(membership.expiresAt)} tarihine kadar` : "Süresiz", null, { label: "Erişim", tone: "success" })),
          ...m.orders.map((order) =>
            row(order.packageName, `${DATE.format(order.createdAt)} · ${(order.totalCents / 100).toLocaleString("tr-TR")} ₺`, order.provisioningError, {
              label: order.status === "PAID" ? (order.provisioningStatus === "SUCCEEDED" ? "Erişim açık" : "Erişim bekliyor") : order.status,
              tone: order.status === "PAID" && order.provisioningStatus !== "SUCCEEDED" ? "critical" : "neutral",
            }),
          ),
        ],
      }),
    );
  }
  if (bundle.timeline) {
    cards.push(card("timeline", "Etkinlik", { rows: bundle.timeline.map((entry) => row(entry.title, entry.summary, `${DATE.format(entry.occurredAt)}${entry.productLabel ? ` · ${entry.productLabel}` : ""}`)), empty: "Etkinlik kaydı yok." }));
  }
  return cards;
}

export function toMobileStudent360(bundle: Student360Bundle, now: Date = new Date()): MobileStudent360 {
  const summary = bundle.summary;
  const learningViews = STUDENT_360_LEARNING_VIEWS.filter((view) => bundle.tabs.includes(view));
  return {
    contractVersion: MOBILE_ADMIN_CONTRACT_VERSION,
    studentProfileId: bundle.access.studentProfileId,
    studentUserId: bundle.access.studentUserId,
    summary: {
      name: summary.fullName,
      email: summary.email,
      detail: [summary.classLevel, summary.targetGoal].filter(Boolean).join(" · "),
      products: summary.productLabels.join(" · ") || "Ürün erişimi yok",
      groups: summary.groups.map((group) => `${group.name} · ${group.subject} (${group.teacherName})`).join(", "),
      coach: summary.coachName,
      packageStatus: { label: STUDENT_360_PACKAGE_STATUS_LABELS[summary.packageStatus], tone: packageTone(summary.packageStatus) },
      risk: { label: STUDENT_360_RISK_LEVEL_LABELS[summary.risk.level], tone: riskTone(summary.risk.level), reasons: summary.risk.whyRisky },
      lastActivityAt: summary.lastActivityAt ? summary.lastActivityAt.toISOString() : null,
    },
    group: bundle.group,
    groups: bundle.groups.map((group) => ({ id: group, label: STUDENT_360_GROUP_LABELS[group] })),
    view: bundle.view,
    views: bundle.group === "ogrenme" ? learningViews.map((view) => ({ id: view, label: STUDENT_360_TAB_LABELS[view] })) : [],
    cards: cardsFor(bundle, now),
    coach: { revision: bundle.coachRevision ?? null, currentCoachId: bundle.currentCoachId, cadenceDays: bundle.currentCadenceDays, options: bundle.coachOptions },
    blockedOrders: (bundle.commerce?.orders ?? []).filter((order) => order.status === "PAID" && order.provisioningStatus !== "SUCCEEDED").map((order) => ({ id: order.id, packageName: order.packageName })),
    // Web'de `canManage = access.role === "ADMIN"` ile aynı koşul.
    manage:
      bundle.access.role === "ADMIN"
        ? {
            parents: bundle.parent ? bundle.parent.parents.map((parent) => ({ id: parent.linkId, name: parent.fullName, detail: [parent.email, parent.relationship].filter(Boolean).join(" · ") })) : null,
            teachers: bundle.teachersTab ? bundle.teachersTab.links.map((link) => ({ id: link.id, name: link.teacherName, subject: link.subject })) : null,
            parentOptions: bundle.parentOptions.map((option) => ({ id: option.id, name: option.label })),
            teacherOptions: bundle.teacherOptions.map((option) => ({ id: option.id, name: option.label })),
          }
        : null,
  };
}
