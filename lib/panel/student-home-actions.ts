import type { ProductCode } from "@prisma/client";
import { ISTANBUL_TIME_ZONE, formatIstanbulDateInput } from "@/lib/istanbul-time";
import type { StudentHomeProductData } from "@/lib/panel/student-home-data";

const TR_TIME = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const DAY_MS = 24 * 60 * 60 * 1000;

export type StudentHomeActionProduct = ProductCode | "SHARED";
export type StudentHomeActionKind =
  | "OPEN_LESSON"
  | "OPEN_RECOVERY"
  | "OPEN_PLAN"
  | "OPEN_ODK_EXAM"
  | "RESUME_ODK_ATTEMPT"
  | "OPEN_REVIEW";
export type StudentHomeActionReason =
  | "LIVE_LESSON"
  | "MISSED_LESSON"
  | "DUE_SOON"
  | "REVIEW_DUE"
  | "NEEDS_REVIEW"
  | "EXAM_APPROACHING"
  | "CAPACITY_BALANCE"
  | "PLAN_OVERDUE"
  | "ODK_ACTIVE_ATTEMPT"
  | "ODK_EXAM_WINDOW";

export type StudentHomeAction = {
  id: string;
  entityKey: string;
  product: StudentHomeActionProduct;
  actionKind: StudentHomeActionKind;
  reasonCode: StudentHomeActionReason;
  title: string;
  description?: string;
  href: string;
  ctaLabel: string;
  reason: string;
  ageBand: "NA" | "0-24H" | "25H-7D" | "8D+";
  priority: number;
  sortTime: number;
};

function toAgeBand(target: Date | null | undefined, now: Date): StudentHomeAction["ageBand"] {
  if (!target) return "NA";
  const diff = Math.abs(target.getTime() - now.getTime());
  if (diff <= DAY_MS) return "0-24H";
  if (diff <= 7 * DAY_MS) return "25H-7D";
  return "8D+";
}

function compareActions(left: StudentHomeAction, right: StudentHomeAction): number {
  if (left.priority !== right.priority) return left.priority - right.priority;
  if (left.sortTime !== right.sortTime) return left.sortTime - right.sortTime;
  return left.id.localeCompare(right.id, "en");
}

function addCandidate(
  list: StudentHomeAction[],
  next: StudentHomeAction,
  seen: Map<string, StudentHomeAction>,
) {
  const existing = seen.get(next.entityKey);
  if (!existing) {
    seen.set(next.entityKey, next);
    list.push(next);
    return;
  }
  if (compareActions(next, existing) < 0) {
    const index = list.findIndex((item) => item.entityKey === next.entityKey);
    if (index >= 0) list[index] = next;
    seen.set(next.entityKey, next);
  }
}

type ActionBuildInput = {
  now: Date;
  productData: StudentHomeProductData;
  products: readonly ProductCode[];
};

export type StudentHomeActionPlan = {
  nowAction: StudentHomeAction | null;
  nextActions: StudentHomeAction[];
  allActions: StudentHomeAction[];
};

export function buildStudentHomeActionPlan(input: ActionBuildInput): StudentHomeActionPlan {
  const { now, productData, products } = input;
  const hasOD = products.includes("OD");
  const hasOK = products.includes("OK");
  const hasODK = products.includes("ODK");

  const candidates: StudentHomeAction[] = [];
  const seen = new Map<string, StudentHomeAction>();

  if (hasOD && productData.OD) {
    for (const lesson of productData.OD.todayLessons) {
      const startsAt = lesson.startsAt.getTime();
      const deltaMinutes = Math.round((startsAt - now.getTime()) / 60000);
      const startsSoon = deltaMinutes >= 0 && deltaMinutes <= 30;
      const activeNow = deltaMinutes < 0 && deltaMinutes >= -90;
      const joinsNow = startsSoon || activeNow;
      addCandidate(candidates, {
        id: `lesson-${lesson.id}`,
        entityKey: `lesson:${lesson.id}`,
        product: "OD",
        actionKind: "OPEN_LESSON",
        reasonCode: "LIVE_LESSON",
        title: `${lesson.title} · Canlı ders`,
        description: [lesson.teacherName, lesson.groupName].filter(Boolean).join(" · "),
        href: `/panel/ogrenci/takvim/${lesson.id}`,
        ctaLabel: joinsNow ? "Derse Katıl" : "Ders Detayı",
        reason: activeNow
          ? "Ders şu anda devam ediyor."
          : startsSoon
            ? `${Math.max(0, deltaMinutes)} dakika sonra başlıyor.`
            : `Bugün ${TR_TIME.format(lesson.startsAt)}'te başlıyor.`,
        ageBand: toAgeBand(lesson.startsAt, now),
        priority: joinsNow ? 0 : 3,
        sortTime: startsAt,
      }, seen);
    }

    if (productData.OD.nextRecovery) {
      const dueAt = productData.OD.nextRecovery.dueAt.getTime();
      const sameDay = formatIstanbulDateInput(productData.OD.nextRecovery.dueAt) === formatIstanbulDateInput(now);
      addCandidate(candidates, {
        id: `recovery-${productData.OD.nextRecovery.id}`,
        entityKey: `recovery:${productData.OD.nextRecovery.id}`,
        product: "OD",
        actionKind: "OPEN_RECOVERY",
        reasonCode: "MISSED_LESSON",
        title: `${productData.OD.nextRecovery.lessonTitle} · Telafi`,
        href: `/panel/ogrenci/telafi?lessonId=${productData.OD.nextRecovery.lessonId}`,
        ctaLabel: "Telafiye Başla",
        reason: dueAt < now.getTime()
          ? "Süresi geçmiş bir telafi adımı bekliyor."
          : sameDay
            ? "Bugün tamamlanması gerekiyor."
            : `Son tarih ${TR_TIME.format(productData.OD.nextRecovery.dueAt)}.`,
        ageBand: toAgeBand(productData.OD.nextRecovery.dueAt, now),
        priority: dueAt < now.getTime() ? 1 : sameDay ? 2 : 4,
        sortTime: dueAt,
      }, seen);
    }
  }

  if (hasOK && productData.OK) {
    for (const task of productData.OK.overdueTasks) {
      addCandidate(candidates, {
        id: `task-overdue-${task.id}`,
        entityKey: task.sourceType === "ASSIGNMENT" && task.sourceReferenceId
          ? `assignment:${task.sourceReferenceId}`
          : `task:${task.id}`,
        product: "OK",
        actionKind: "OPEN_PLAN",
        reasonCode: "PLAN_OVERDUE",
        title: `${task.title} · ${task.durationMinutes} dk`,
        href: "/panel/ogrenci/plan",
        ctaLabel: "Göreve Başla",
        reason: "Dünden kalan bir plan görevi var.",
        ageBand: toAgeBand(task.scheduledFor, now),
        priority: 1,
        sortTime: task.scheduledFor.getTime(),
      }, seen);
    }
    for (const task of productData.OK.todayTasks) {
      addCandidate(candidates, {
        id: `task-today-${task.id}`,
        entityKey: task.sourceType === "ASSIGNMENT" && task.sourceReferenceId
          ? `assignment:${task.sourceReferenceId}`
          : `task:${task.id}`,
        product: "OK",
        actionKind: "OPEN_PLAN",
        reasonCode: task.reasonCode,
        title: `${task.title} · ${task.durationMinutes} dk`,
        href: "/panel/ogrenci/plan",
        ctaLabel: "Göreve Başla",
        reason: "Bugünkü planında yer alıyor.",
        ageBand: toAgeBand(task.scheduledFor, now),
        priority: 2,
        sortTime: task.scheduledFor.getTime(),
      }, seen);
    }
  }

  if (hasODK && productData.ODK) {
    if (productData.ODK.activeAttempt) {
      addCandidate(candidates, {
        id: `odk-attempt-${productData.ODK.activeAttempt.id}`,
        entityKey: `odk-exam:${productData.ODK.activeAttempt.id}`,
        product: "ODK",
        actionKind: "RESUME_ODK_ATTEMPT",
        reasonCode: "ODK_ACTIVE_ATTEMPT",
        title: productData.ODK.activeAttempt.title,
        href: `/panel/odk/ogrenci/denemeler/${productData.ODK.activeAttempt.id}/coz`,
        ctaLabel: "Denemeye Devam Et",
        reason: "Denemen devam ediyor.",
        ageBand: toAgeBand(productData.ODK.activeAttempt.startsAt, now),
        priority: 0,
        sortTime: productData.ODK.activeAttempt.startsAt?.getTime() ?? 0,
      }, seen);
    }
    if (productData.ODK.upcomingExam) {
      const startsAt = productData.ODK.upcomingExam.startsAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const startsSoon = startsAt <= now.getTime() + 3 * 60 * 60 * 1000;
      addCandidate(candidates, {
        id: `odk-exam-${productData.ODK.upcomingExam.id}`,
        entityKey: `odk-exam:${productData.ODK.upcomingExam.id}`,
        product: "ODK",
        actionKind: "OPEN_ODK_EXAM",
        reasonCode: "ODK_EXAM_WINDOW",
        title: productData.ODK.upcomingExam.title,
        href: `/panel/odk/ogrenci/denemeler/${productData.ODK.upcomingExam.id}`,
        ctaLabel: productData.ODK.upcomingExam.status === "LIVE" ? "Denemeyi Başlat" : "Deneme Detayı",
        reason: productData.ODK.upcomingExam.status === "LIVE"
          ? "Sınav penceresi açık."
          : productData.ODK.upcomingExam.startsAt
            ? `${TR_TIME.format(productData.ODK.upcomingExam.startsAt)} için planlandı.`
            : "Başlama saati bu ekrandan takip edilebilir.",
        ageBand: toAgeBand(productData.ODK.upcomingExam.startsAt, now),
        priority: productData.ODK.upcomingExam.status === "LIVE" ? 0 : startsSoon ? 3 : 4,
        sortTime: startsAt,
      }, seen);
    }
  }

  if (productData.SHARED?.dueReview) {
    addCandidate(candidates, {
      id: `review-${productData.SHARED.dueReview.id}`,
      entityKey: `review:${productData.SHARED.dueReview.id}`,
      product: "SHARED",
      actionKind: "OPEN_REVIEW",
      reasonCode: "REVIEW_DUE",
      title: productData.SHARED.dueReview.title,
      href: "/panel/ogrenci/tekrar",
      ctaLabel: "Tekrara Başla",
      reason: "Bugünkü tekrar kuyruğunda yer alıyor.",
      ageBand: toAgeBand(productData.SHARED.dueReview.dueAt, now),
      priority: 4,
      sortTime: productData.SHARED.dueReview.dueAt.getTime(),
    }, seen);
  }

  const allActions = [...candidates].sort(compareActions);
  return {
    nowAction: allActions[0] ?? null,
    nextActions: allActions.slice(1, 3),
    allActions,
  };
}
