import type { LeadStage, ProductInterest } from "@prisma/client";

type LifecycleTone = "critical" | "warning" | "success" | "neutral";

export type LeadLifecycleStatus = {
  code:
    | "PRE_SALE"
    | "WON_WITHOUT_ORDER"
    | "PAID_ACCOUNT_PENDING"
    | "ACCOUNT_READY";
  label: string;
  tone: LifecycleTone;
  nextAction: string;
};

export function deriveLeadLifecycleStatus(input: {
  stage: LeadStage;
  productInterest: ProductInterest;
  relatedOdOrderId: string | null;
  relatedOdkOrderId: string | null;
  relatedOdUserId: string | null;
  relatedOdkUserId: string | null;
}): LeadLifecycleStatus {
  if (input.stage !== "WON") {
    return {
      code: "PRE_SALE",
      label: "Satış dönüşümü bekleniyor",
      tone: "neutral",
      nextAction: "Adayı satış aşamasına ilerlet",
    };
  }

  const orderId =
    input.productInterest === "ONLINE_DENEME_KULUBU"
      ? input.relatedOdkOrderId
      : input.relatedOdOrderId || input.relatedOdkOrderId;
  const userId =
    input.productInterest === "ONLINE_DENEME_KULUBU"
      ? input.relatedOdkUserId
      : input.relatedOdUserId || input.relatedOdkUserId;

  if (!orderId) {
    return {
      code: "WON_WITHOUT_ORDER",
      label: "Satış var, sipariş bağı eksik",
      tone: "warning",
      nextAction: "Satışı sipariş/ödeme kaydıyla eşleştir",
    };
  }
  if (!userId) {
    return {
      code: "PAID_ACCOUNT_PENDING",
      label: "Ödeme alındı, hesap bağlantısı bekliyor",
      tone: "critical",
      nextAction: "Siparişi öğrenci hesabına bağla",
    };
  }
  return {
    code: "ACCOUNT_READY",
    label: "Öğrenci hesabı hazır",
    tone: "success",
    nextAction: "İlk hizmet başlangıcını işler ekranından takip et",
  };
}

export type UnifiedOperationSeverity = "BLOCKING" | "ACTION_REQUIRED" | "WATCH";

export type UnifiedOperationItem = {
  id: string;
  code:
    | "PAID_NO_ACCOUNT"
    | "PAID_NO_PARENT"
    | "PAID_NO_GROUP"
    | "PAID_NO_FIRST_LESSON"
    | "TEACHER_HANDOFF_NEEDED"
    | "ONBOARDING_BLOCKED"
    | "LESSON_CANCELLED";
  severity: UnifiedOperationSeverity;
  title: string;
  detail: string;
  owner: string;
  dueAt: Date | null;
  nextAction: string;
  resolution: "OPEN" | "RESOLVED";
  href: string;
  ctaLabel: string;
  createdAt: Date;
};

type OnboardingExceptionCandidate = {
  id: string;
  orderId: string;
  packageName: string;
  state: string;
  blockerReason: string | null;
  ownerName: string | null;
  dueAt: Date | null;
  stateEnteredAt: Date;
  studentLabel: string;
  hasAccount: boolean;
  hasParent: boolean;
  hasGroup: boolean;
  hasFirstLesson: boolean;
  studentProfileId: string | null;
  nextAction: string;
};

type CancelledLessonCandidate = {
  id: string;
  title: string;
  startsAt: Date;
  groupName: string;
  teacherName: string | null;
  hasFollowUpLesson: boolean;
};

export function deriveUnifiedOperationItems(input: {
  now: Date;
  onboardings: OnboardingExceptionCandidate[];
  cancelledLessons: CancelledLessonCandidate[];
}): UnifiedOperationItem[] {
  const rows: UnifiedOperationItem[] = [];

  for (const item of input.onboardings) {
    const owner = item.ownerName || "Atanmamış";
    const defaultHref = item.studentProfileId
      ? `/panel/yonetim/ogrenciler/${item.studentProfileId}`
      : `/panel/yonetim/siparisler/${item.orderId}`;
    const detail = `${item.packageName} · ${item.studentLabel}`;
    const placementStale =
      ["PLACEMENT_PENDING", "WAITLISTED", "ALTERNATE_SLOT_OFFERED", "ALTERNATE_SLOT_ACCEPTED"].includes(item.state) &&
      Boolean(item.dueAt && item.dueAt < input.now);

    if (["MANUAL_REVIEW", "BLOCKED", "REFUND_PENDING"].includes(item.state)) {
      rows.push({
        id: `blocked-${item.id}`,
        code: "ONBOARDING_BLOCKED",
        severity: "BLOCKING",
        title: "Aktivasyon bloke durumda",
        detail: item.blockerReason ? `${detail} · ${item.blockerReason}` : detail,
        owner,
        dueAt: item.dueAt,
        nextAction: item.nextAction,
        resolution: "OPEN",
        href: `/panel/yonetim/siparisler/${item.orderId}`,
        ctaLabel: "Siparişi Aç",
        createdAt: item.stateEnteredAt,
      });
      continue;
    }
    if (!item.hasAccount) {
      rows.push({
        id: `no-account-${item.id}`,
        code: "PAID_NO_ACCOUNT",
        severity: "BLOCKING",
        title: "Ödeme alındı ama erişim hesabı yok",
        detail,
        owner,
        dueAt: item.dueAt,
        nextAction: "Siparişi öğrenci hesabına bağla",
        resolution: "OPEN",
        href: `/panel/yonetim/siparisler/${item.orderId}`,
        ctaLabel: "Siparişi Aç",
        createdAt: item.stateEnteredAt,
      });
      continue;
    }
    if (!item.hasParent) {
      rows.push({
        id: `no-parent-${item.id}`,
        code: "PAID_NO_PARENT",
        severity: "ACTION_REQUIRED",
        title: "Veli bağlantısı eksik",
        detail,
        owner,
        dueAt: item.dueAt,
        nextAction: "Aktif veli hesabını öğrenciye bağla",
        resolution: "OPEN",
        href: defaultHref,
        ctaLabel: "Öğrenciyi Aç",
        createdAt: item.stateEnteredAt,
      });
      continue;
    }
    if (!item.hasGroup) {
      const teacherHandoff = placementStale;
      rows.push({
        id: `${teacherHandoff ? "teacher-handoff" : "no-group"}-${item.id}`,
        code: teacherHandoff ? "TEACHER_HANDOFF_NEEDED" : "PAID_NO_GROUP",
        severity: "ACTION_REQUIRED",
        title: teacherHandoff ? "Öğretmen devri/yerleştirme müdahalesi gerekiyor" : "Öğrenci gruba atanmadı",
        detail,
        owner,
        dueAt: item.dueAt,
        nextAction: teacherHandoff ? "Öğretmen kapasitesini güncelleyip yeniden yerleştir" : "Öğrenciyi uygun gruba ata",
        resolution: "OPEN",
        href: defaultHref,
        ctaLabel: "Öğrenciyi Aç",
        createdAt: item.stateEnteredAt,
      });
      continue;
    }
    if (!item.hasFirstLesson) {
      rows.push({
        id: `no-lesson-${item.id}`,
        code: "PAID_NO_FIRST_LESSON",
        severity: "ACTION_REQUIRED",
        title: "İlk ders henüz planlanmadı",
        detail,
        owner,
        dueAt: item.dueAt,
        nextAction: "İlk dersi takvime planla",
        resolution: "OPEN",
        href: defaultHref,
        ctaLabel: "Öğrenciyi Aç",
        createdAt: item.stateEnteredAt,
      });
    }
  }

  for (const lesson of input.cancelledLessons) {
    rows.push({
      id: `cancelled-${lesson.id}`,
      code: "LESSON_CANCELLED",
      severity: lesson.hasFollowUpLesson ? "WATCH" : "ACTION_REQUIRED",
      title: lesson.hasFollowUpLesson ? "Ders iptal edildi, telafi planı mevcut" : "Ders iptal edildi",
      detail: `${lesson.groupName} · ${lesson.title}`,
      owner: lesson.teacherName || "Öğretmen ataması bekleniyor",
      dueAt: new Date(lesson.startsAt.getTime() + 24 * 60 * 60 * 1000),
      nextAction: lesson.hasFollowUpLesson
        ? "Telafi dersini veli/öğrenciye bildir"
        : "Telafi dersi planla ve öğrenciyi bilgilendir",
      resolution: lesson.hasFollowUpLesson ? "RESOLVED" : "OPEN",
      href: "/panel/yonetim/takvim",
      ctaLabel: "Takvimi Aç",
      createdAt: lesson.startsAt,
    });
  }

  return rows.sort((a, b) => {
    const rank: Record<UnifiedOperationSeverity, number> = {
      BLOCKING: 0,
      ACTION_REQUIRED: 1,
      WATCH: 2,
    };
    const bySeverity = rank[a.severity] - rank[b.severity];
    if (bySeverity !== 0) return bySeverity;
    const aDue = a.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bDue = b.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (aDue !== bDue) return aDue - bDue;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}
