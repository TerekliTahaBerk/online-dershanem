/**
 * Lead lifecycle timeline — gerçek event kayıtlarından türetilir.
 * Sahte/placeholder adımlar üretilmez; yalnızca olan olaylar listelenir.
 */

export type LifecycleTimelineKind =
  | "INSTAGRAM_MESSAGE"
  | "LEAD_CREATED"
  | "CONTACTED"
  | "OFFERED"
  | "WON"
  | "ORDER"
  | "PAYMENT"
  | "PROVISIONING"
  | "STUDENT_ACCOUNT"
  | "NOTE"
  | "OTHER";

export type LifecycleTimelineEvent = {
  id: string;
  kind: LifecycleTimelineKind;
  label: string;
  detail: string | null;
  occurredAt: Date;
  actorUserId: string | null;
  href: string | null;
};

export type LeadActivityInput = {
  id: string;
  type: string;
  fromValue: string | null;
  toValue: string | null;
  actorUserId: string | null;
  metadata: unknown;
  createdAt: Date;
};

export type LeadTimelineSource = {
  leadId: string;
  createdAt: Date;
  source: string;
  conversationId: string | null;
  firstMessageAt: Date | null;
  activities: LeadActivityInput[];
  relatedOdOrderId: string | null;
  relatedOdkOrderId: string | null;
  relatedOdUserId: string | null;
  relatedOdkUserId: string | null;
  orderEvents?: Array<{
    id: string;
    product: "OD" | "ODK";
    status: string;
    createdAt: Date;
    paidAt: Date | null;
    provisioningStatus: string | null;
    provisionedAt: Date | null;
    provisioningError: string | null;
    userId: string | null;
  }>;
};

function activityKind(type: string, toValue: string | null): LifecycleTimelineKind {
  const upper = type.toUpperCase();
  if (upper === "STAGE_CHANGED") {
    if (toValue === "CONTACTED" || toValue === "QUALIFIED" || toValue === "MEETING_PLANNED" || toValue === "TRIAL_PLANNED") {
      return "CONTACTED";
    }
    if (toValue === "OFFER_SENT" || toValue === "PAYMENT_PENDING") return "OFFERED";
    if (toValue === "WON") return "WON";
    return "OTHER";
  }
  if (upper === "PAYMENT_COMPLETED") return "PAYMENT";
  if (upper === "NOTE_ADDED" || upper === "NOTE") return "NOTE";
  if (upper.includes("PROVISION")) return "PROVISIONING";
  if (upper.includes("ORDER") || upper === "ORDER_LINKED") return "ORDER";
  if (upper.includes("USER") || upper === "ACCOUNT_LINKED" || upper === "STUDENT_LINKED") return "STUDENT_ACCOUNT";
  return "OTHER";
}

function activityLabel(type: string, fromValue: string | null, toValue: string | null): string {
  const upper = type.toUpperCase();
  if (upper === "STAGE_CHANGED") {
    if (toValue === "CONTACTED") return "Görüşme yapıldı";
    if (toValue === "QUALIFIED" || toValue === "MEETING_PLANNED" || toValue === "TRIAL_PLANNED") return "Aday nitelikli hale getirildi";
    if (toValue === "OFFER_SENT") return "Teklif verildi";
    if (toValue === "PAYMENT_PENDING") return "Ödeme bekleniyor";
    if (toValue === "WON") return "Satış kazanıldı";
    if (toValue === "LOST" || toValue === "SPAM") return "Aday kaybedildi";
    return `Aşama: ${fromValue ?? "—"} → ${toValue ?? "—"}`;
  }
  if (upper === "PAYMENT_COMPLETED") return "Ödeme alındı";
  if (upper === "NOTE_ADDED" || upper === "NOTE") return "Not eklendi";
  if (upper === "ORDER_LINKED") return "Sipariş bağlandı";
  if (upper === "ACCOUNT_LINKED" || upper === "STUDENT_LINKED" || upper === "USER_LINKED") return "Öğrenci hesabı bağlandı";
  if (upper === "LEAD_CREATED") return "Lead oluşturuldu";
  return type.replaceAll("_", " ");
}

/**
 * LeadActivity + sipariş/ödeme/provisioning kayıtlarından sıralı timeline.
 */
export function buildLeadLifecycleTimeline(source: LeadTimelineSource): LifecycleTimelineEvent[] {
  const events: LifecycleTimelineEvent[] = [];

  if (source.firstMessageAt && source.conversationId) {
    events.push({
      id: `ig-${source.conversationId}`,
      kind: "INSTAGRAM_MESSAGE",
      label: "Instagram mesajı",
      detail: "İlk gelen mesaj",
      occurredAt: source.firstMessageAt,
      actorUserId: null,
      href: `/panel/yonetim/isletme/mesaj-kutusu?conversation=${source.conversationId}`,
    });
  }

  events.push({
    id: `lead-created-${source.leadId}`,
    kind: "LEAD_CREATED",
    label: "Lead oluşturuldu",
    detail: source.source,
    occurredAt: source.createdAt,
    actorUserId: null,
    href: null,
  });

  for (const activity of source.activities) {
    // Lead create zaten yukarıda; duplicate ACTIVITY tipini atla
    if (activity.type.toUpperCase() === "LEAD_CREATED") continue;
    const meta = activity.metadata && typeof activity.metadata === "object" && !Array.isArray(activity.metadata)
      ? (activity.metadata as Record<string, unknown>)
      : {};
    const orderId = typeof meta.orderId === "string" ? meta.orderId : null;
    events.push({
      id: `activity-${activity.id}`,
      kind: activityKind(activity.type, activity.toValue),
      label: activityLabel(activity.type, activity.fromValue, activity.toValue),
      detail: activity.fromValue && activity.toValue ? `${activity.fromValue} → ${activity.toValue}` : null,
      occurredAt: activity.createdAt,
      actorUserId: activity.actorUserId,
      href: orderId
        ? `/panel/yonetim/siparisler/${orderId}`
        : null,
    });
  }

  for (const order of source.orderEvents ?? []) {
    const href = `/panel/yonetim/siparisler/${order.id}`;
    events.push({
      id: `order-${order.id}`,
      kind: "ORDER",
      label: `${order.product} sipariş`,
      detail: order.status,
      occurredAt: order.createdAt,
      actorUserId: null,
      href,
    });
    if (order.paidAt) {
      events.push({
        id: `payment-${order.id}`,
        kind: "PAYMENT",
        label: "Ödeme",
        detail: "PAID",
        occurredAt: order.paidAt,
        actorUserId: null,
        href,
      });
    }
    if (order.provisioningStatus) {
      const provisionAt = order.provisionedAt ?? order.paidAt ?? order.createdAt;
      events.push({
        id: `provision-${order.id}`,
        kind: "PROVISIONING",
        label: "Provisioning",
        detail: order.provisioningError
          ? `${order.provisioningStatus}: ${order.provisioningError}`
          : order.provisioningStatus,
        occurredAt: provisionAt,
        actorUserId: null,
        href,
      });
    }
    if (order.userId) {
      events.push({
        id: `account-${order.id}-${order.userId}`,
        kind: "STUDENT_ACCOUNT",
        label: "Öğrenci hesabı",
        detail: order.userId,
        occurredAt: order.provisionedAt ?? order.paidAt ?? order.createdAt,
        actorUserId: null,
        href: `/panel/yonetim/kullanicilar/${order.userId}`,
      });
    }
  }

  // Aynı saniyede birden fazla kayıt: kind önceliğiyle kararlı sıralama
  const kindRank: Record<LifecycleTimelineKind, number> = {
    INSTAGRAM_MESSAGE: 0,
    LEAD_CREATED: 1,
    CONTACTED: 2,
    OFFERED: 3,
    WON: 4,
    ORDER: 5,
    PAYMENT: 6,
    PROVISIONING: 7,
    STUDENT_ACCOUNT: 8,
    NOTE: 9,
    OTHER: 10,
  };

  const seen = new Set<string>();
  return events
    .sort((a, b) => {
      const t = a.occurredAt.getTime() - b.occurredAt.getTime();
      if (t !== 0) return t;
      return kindRank[a.kind] - kindRank[b.kind];
    })
    .filter((event) => {
      // Aynı dakikadaki aynı kind (özellikle PAYMENT / WON) tek gösterilir.
      const key = `${event.kind}:${Math.floor(event.occurredAt.getTime() / 60_000)}`;
      if (seen.has(key) && (event.kind === "PAYMENT" || event.kind === "WON")) return false;
      seen.add(key);
      return true;
    });
}
