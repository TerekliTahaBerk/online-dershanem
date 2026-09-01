import type {
  LeadLostReasonCode,
  LeadPriority,
  LeadSource,
  LeadStage,
  Prisma,
  ProductInterest,
} from "@prisma/client";
import { istanbulDayEnd, istanbulDayStart } from "@/lib/istanbul-time";

export const LEAD_STAGES: readonly LeadStage[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "MEETING_PLANNED",
  "TRIAL_PLANNED",
  "OFFER_SENT",
  "PAYMENT_PENDING",
  "WON",
  "LOST",
  "SPAM",
] as const;

export const OPEN_LEAD_STAGES: readonly LeadStage[] = LEAD_STAGES.filter(
  (stage) => stage !== "WON" && stage !== "LOST" && stage !== "SPAM",
);

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  NEW: "Yeni",
  CONTACTED: "İletişime geçildi",
  QUALIFIED: "Nitelikli",
  MEETING_PLANNED: "Görüşme planlandı",
  TRIAL_PLANNED: "Deneme planlandı",
  OFFER_SENT: "Teklif gönderildi",
  PAYMENT_PENDING: "Ödeme bekleniyor",
  WON: "Kazanıldı",
  LOST: "Kaybedildi",
  SPAM: "Spam",
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  INSTAGRAM_ORGANIC: "Instagram organik",
  INSTAGRAM_AD: "Instagram reklam",
  OD_WEB_FORM: "OD web formu",
  ODK_WEB_FORM: "ODK web formu",
  PURCHASE_STARTED: "Satın alma başladı",
  PURCHASE_COMPLETED: "Satın alma tamamlandı",
  MANUAL: "Manuel",
  OTHER: "Diğer",
};

export const PRODUCT_INTEREST_LABELS: Record<ProductInterest, string> = {
  ONLINE_DERSHANEM: "OnlineDershanem",
  ONLINE_DENEME_KULUBU: "Deneme Kulübü",
  UNKNOWN: "Ürün bilinmiyor",
};

export const LEAD_PRIORITY_LABELS: Record<LeadPriority, string> = {
  LOW: "Düşük",
  NORMAL: "Normal",
  HIGH: "Yüksek",
  URGENT: "Acil",
};

export const LEAD_LOST_REASON_CODES: readonly LeadLostReasonCode[] = [
  "PRICE",
  "UNREACHABLE",
  "COMPETITOR",
  "DECISION_POSTPONED",
  "PRODUCT_MISMATCH",
  "WRONG_LEAD",
  "OTHER",
] as const;

export const LEAD_LOST_REASON_LABELS: Record<LeadLostReasonCode, string> = {
  PRICE: "Fiyat",
  UNREACHABLE: "Ulaşamadık",
  COMPETITOR: "Rakip",
  DECISION_POSTPONED: "Karar ertelendi",
  PRODUCT_MISMATCH: "Ürün uygun değil",
  WRONG_LEAD: "Yanlış lead",
  OTHER: "Diğer",
};

export type LeadListFocus =
  | "today"
  | "overdue"
  | "no_activity"
  | "all"
  | "mine";

export type LeadListFilters = {
  focus?: LeadListFocus;
  stage?: LeadStage | "ALL";
  ownerId?: string | "ALL" | "UNASSIGNED";
  source?: LeadSource | "ALL";
  campaignId?: string | "ALL";
  interest?: ProductInterest | "ALL";
  q?: string;
  now?: Date;
};

export function leadDisplayName(lead: {
  firstName?: string | null;
  lastName?: string | null;
  studentName?: string | null;
  instagramScopedId?: string | null;
  phone?: string | null;
  email?: string | null;
}): string {
  const full = [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim();
  return full || lead.studentName || lead.instagramScopedId || lead.phone || lead.email || "Adsız aday";
}

export function isFollowUpOverdue(
  nextFollowUpAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  return Boolean(nextFollowUpAt && nextFollowUpAt.getTime() < now.getTime());
}

export function isFollowUpToday(
  nextFollowUpAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!nextFollowUpAt) return false;
  const start = istanbulDayStart(now).getTime();
  const end = istanbulDayEnd(now).getTime();
  const at = nextFollowUpAt.getTime();
  return at >= start && at <= end;
}

/**
 * Default CRM list = "Bugün ilgilenmem gereken adaylar":
 * overdue follow-ups + today's follow-ups + open tasks due today/overdue,
 * excluding terminal stages.
 */
export function buildLeadWhere(
  unitIds: string[],
  filters: LeadListFilters = {},
): Prisma.BusinessLeadWhereInput {
  const now = filters.now ?? new Date();
  const focus = filters.focus ?? "today";
  const dayStart = istanbulDayStart(now);
  const dayEnd = istanbulDayEnd(now);
  const and: Prisma.BusinessLeadWhereInput[] = [
    { businessUnitId: { in: unitIds } },
    { anonymizedAt: null },
  ];

  if (filters.stage && filters.stage !== "ALL") {
    and.push({ stage: filters.stage });
  }

  if (filters.ownerId === "UNASSIGNED") {
    and.push({ assignedUserId: null });
  } else if (filters.ownerId && filters.ownerId !== "ALL") {
    and.push({ assignedUserId: filters.ownerId });
  }

  if (filters.source && filters.source !== "ALL") {
    and.push({ source: filters.source });
  }

  if (filters.interest && filters.interest !== "ALL") {
    and.push({ productInterest: filters.interest });
  }

  if (filters.campaignId && filters.campaignId !== "ALL") {
    and.push({
      OR: [
        { campaignId: filters.campaignId },
        { attributions: { some: { campaignId: filters.campaignId } } },
      ],
    });
  }

  const q = filters.q?.trim();
  if (q) {
    and.push({
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { studentName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { email: { contains: q, mode: "insensitive" } },
        { instagramScopedId: { contains: q } },
      ],
    });
  }

  if (focus === "today") {
    and.push({ stage: { in: [...OPEN_LEAD_STAGES] } });
    and.push({
      OR: [
        { nextFollowUpAt: { lte: dayEnd } },
        {
          tasks: {
            some: {
              completedAt: null,
              dueAt: { lte: dayEnd },
            },
          },
        },
      ],
    });
  } else if (focus === "overdue") {
    and.push({ stage: { in: [...OPEN_LEAD_STAGES] } });
    and.push({
      OR: [
        { nextFollowUpAt: { lt: dayStart } },
        {
          tasks: {
            some: {
              completedAt: null,
              dueAt: { lt: dayStart },
            },
          },
        },
      ],
    });
  } else if (focus === "no_activity") {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    and.push({ stage: { in: [...OPEN_LEAD_STAGES] } });
    and.push({ lastContactAt: { lt: sevenDaysAgo } });
  } else if (focus === "mine" && filters.ownerId && filters.ownerId !== "ALL" && filters.ownerId !== "UNASSIGNED") {
    and.push({ assignedUserId: filters.ownerId });
    and.push({ stage: { in: [...OPEN_LEAD_STAGES] } });
  }

  return { AND: and };
}

export type StageTransitionInput = {
  from: LeadStage;
  to: LeadStage;
  lostReasonCode?: LeadLostReasonCode | null;
  lostReasonDetail?: string | null;
};

export type StageTransitionResult =
  | {
      ok: true;
      data: {
        stage: LeadStage;
        lostReasonCode: LeadLostReasonCode | null;
        lostReason: string | null;
        wonAt: Date | null;
        lostAt: Date | null;
        clearLost: boolean;
      };
    }
  | { ok: false; error: "LOST_REASON_REQUIRED" | "INVALID_STAGE" | "SAME_STAGE" };

export function validateStageTransition(
  input: StageTransitionInput,
  now: Date = new Date(),
): StageTransitionResult {
  if (!LEAD_STAGES.includes(input.to)) return { ok: false, error: "INVALID_STAGE" };
  if (input.from === input.to) return { ok: false, error: "SAME_STAGE" };

  if (input.to === "LOST") {
    if (!input.lostReasonCode || !LEAD_LOST_REASON_CODES.includes(input.lostReasonCode)) {
      return { ok: false, error: "LOST_REASON_REQUIRED" };
    }
    if (input.lostReasonCode === "OTHER" && !input.lostReasonDetail?.trim()) {
      return { ok: false, error: "LOST_REASON_REQUIRED" };
    }
    const detail =
      input.lostReasonCode === "OTHER"
        ? input.lostReasonDetail!.trim()
        : input.lostReasonDetail?.trim() || LEAD_LOST_REASON_LABELS[input.lostReasonCode];
    return {
      ok: true,
      data: {
        stage: "LOST",
        lostReasonCode: input.lostReasonCode,
        lostReason: detail,
        wonAt: null,
        lostAt: now,
        clearLost: false,
      },
    };
  }

  if (input.to === "WON") {
    return {
      ok: true,
      data: {
        stage: "WON",
        lostReasonCode: null,
        lostReason: null,
        wonAt: now,
        lostAt: null,
        clearLost: true,
      },
    };
  }

  return {
    ok: true,
    data: {
      stage: input.to,
      lostReasonCode: null,
      lostReason: null,
      wonAt: null,
      lostAt: null,
      clearLost: input.from === "LOST" || input.from === "WON",
    },
  };
}

export function nextActionForLead(lead: {
  stage: LeadStage;
  nextFollowUpAt: Date | null;
  lastContactAt: Date;
  productInterest: ProductInterest;
  relatedOdOrderId?: string | null;
  relatedOdkOrderId?: string | null;
}, now: Date = new Date()): string {
  if (lead.stage === "WON") {
    const hasOrder = Boolean(lead.relatedOdOrderId || lead.relatedOdkOrderId);
    return hasOrder ? "Sipariş / provisioning durumunu kontrol et" : "Sipariş oluştur veya mevcut siparişe bağla";
  }
  if (lead.stage === "LOST" || lead.stage === "SPAM") return "Kapalı — yeniden açmak için aşamayı değiştir";
  if (isFollowUpOverdue(lead.nextFollowUpAt, now)) return "Geciken takip — hemen ara / yaz";
  if (isFollowUpToday(lead.nextFollowUpAt, now)) return "Bugün takip et";
  if (!lead.nextFollowUpAt) return "Takip tarihi planla";
  const idleDays = Math.floor((now.getTime() - lead.lastContactAt.getTime()) / (24 * 60 * 60 * 1000));
  if (idleDays >= 7) return "7+ gündür temas yok — yeniden aç";
  return `${LEAD_STAGE_LABELS[lead.stage]} — sıradaki adımı ilerlet`;
}

export function sortLeadsForWorklist<T extends {
  nextFollowUpAt: Date | null;
  priority: LeadPriority;
  lastContactAt: Date;
  updatedAt: Date;
}>(leads: T[], now: Date = new Date()): T[] {
  const priorityRank: Record<LeadPriority, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
  return [...leads].sort((a, b) => {
    const aOverdue = isFollowUpOverdue(a.nextFollowUpAt, now) ? 0 : 1;
    const bOverdue = isFollowUpOverdue(b.nextFollowUpAt, now) ? 0 : 1;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;
    const aToday = isFollowUpToday(a.nextFollowUpAt, now) ? 0 : 1;
    const bToday = isFollowUpToday(b.nextFollowUpAt, now) ? 0 : 1;
    if (aToday !== bToday) return aToday - bToday;
    if (priorityRank[a.priority] !== priorityRank[b.priority]) {
      return priorityRank[a.priority] - priorityRank[b.priority];
    }
    const aFollow = a.nextFollowUpAt?.getTime() ?? Number.POSITIVE_INFINITY;
    const bFollow = b.nextFollowUpAt?.getTime() ?? Number.POSITIVE_INFINITY;
    if (aFollow !== bFollow) return aFollow - bFollow;
    return b.lastContactAt.getTime() - a.lastContactAt.getTime();
  });
}
