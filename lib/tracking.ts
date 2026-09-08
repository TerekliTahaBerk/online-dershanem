/**
 * Dönüşüm izleme — İSTEMCİ VE SUNUCUDA çalışır.
 *
 * `node:crypto`'dan HİÇBİR ŞEY İÇE AKTARMA. Bu modül `"use client"`
 * bileşenlerinden (satın alma CTA'sı, sepet, paket kurgulayıcı) çağrılıyor;
 * `node:crypto` tarayıcı paketine girdiğinde `randomUUID` tanımsız bir alana
 * dönüşüyor ve olay yayınlarken `TypeError` fırlıyordu. O hata satın alma
 * CTA'sının `onClick`'ini yarıda kesiyor, ürün sepete ekleniyor ama
 * `router.push("/sepet")` HİÇ çalışmıyordu: ziyaretçi hiçbir geri bildirim
 * almadan paket sayfasında kalıyordu. Sunucuya özgü kimlik üretimi için
 * `lib/tracking-id.ts`.
 */

/** Tarayıcı ve Node 19+ ortak API'si; yoksa kriptografik olmayan yedek. */
function newEventId(): string {
  const webCrypto = globalThis.crypto;
  if (webCrypto && typeof webCrypto.randomUUID === "function") {
    return webCrypto.randomUUID();
  }
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export type TrackingProviderName = "console" | "noop";
export type TrackingContext = {
  source?: string;
  campaign?: string;
  product?: string;
  examTrack?: string;
  format?: string;
  billingPeriod?: string;
  sessionId?: string;
  anonymousId?: string;
};

export type TrackingEventName =
  | "public_product_viewed"
  | "package_builder_started"
  | "package_selection_changed"
  | "package_quote_viewed"
  | "checkout_started"
  | "checkout_payment_succeeded"
  | "checkout_payment_failed"
  | "account_provisioned"
  | "panel_first_login"
  | "student_first_value"
  | "parent_first_value"
  | "purchase_cta_click"
  | "cart_checkout_open"
  | "trial_cta_click"
  | "hero_cta_click"
  | "pricing_cta_click"
  | "sticky_cta_click"
  | "landing_cta_click";

type TrackingEventPayload = Record<string, string | number | boolean | null | undefined>;

type TrackingEventMap = {
  public_product_viewed: { product: string; source?: string };
  package_builder_started: { product: string; source?: string };
  package_selection_changed: { product: string; examTrack?: string; format?: string; billingPeriod?: string };
  package_quote_viewed: { product: string; examTrack?: string; billingPeriod?: string; source?: string };
  checkout_started: { product?: string; billingPeriod?: string; source?: string };
  checkout_payment_succeeded: { product?: string; billingPeriod?: string; source?: string };
  checkout_payment_failed: { product?: string; billingPeriod?: string; source?: string; reason?: string };
  account_provisioned: { source?: string; product?: string; examTrack?: string; billingPeriod?: string };
  panel_first_login: { source?: string };
  student_first_value: { source?: string; product?: string };
  parent_first_value: { source?: string; product?: string };
  purchase_cta_click: { source?: string; packageName?: string };
  cart_checkout_open: { count?: number; totalCents?: number };
  trial_cta_click: { source?: string; goal?: string };
  hero_cta_click: { source?: string };
  pricing_cta_click: { source?: string };
  sticky_cta_click: { source?: string };
  landing_cta_click: { source?: string };
};

type TrackingRecord = {
  name: TrackingEventName;
  payload: TrackingEventPayload;
  context: TrackingContext;
  provider: TrackingProviderName;
  eventId: string;
  occurredAt: string;
};

const enabledProvider: TrackingProviderName = process.env.TRACKING_PROVIDER === "console" ? "console" : "noop";

/**
 * İzleme HİÇBİR KOŞULDA çağıranı bozmamalı.
 *
 * Bu fonksiyon bir satın alma CTA'sının `onClick`'i içinden çağrılıyor;
 * buradan fırlayan her hata kullanıcının akışını (sepete git) kesiyor.
 * Analitik en iyi çaba işidir, kritik yol değildir.
 */
function emitTrackingEvent(name: TrackingEventName, payload: TrackingEventPayload, context: TrackingContext): void {
  try {
    emitTrackingEventUnsafe(name, payload, context);
  } catch {
    // Sessizce yut: kullanıcı akışı analitikten önce gelir.
  }
}

function emitTrackingEventUnsafe(name: TrackingEventName, payload: TrackingEventPayload, context: TrackingContext): void {
  const record: TrackingRecord = {
    name,
    payload,
    context,
    provider: enabledProvider,
    eventId: newEventId(),
    occurredAt: new Date().toISOString(),
  };

  if (enabledProvider === "console") {
    console.info("tracking.event", record);
    return;
  }

  console.info("tracking.event_dropped", { name, provider: enabledProvider, eventId: record.eventId });
}

export function trackConversionEvent<T extends TrackingEventName>(
  event: T,
  payload?: TrackingEventMap[T],
  context: TrackingContext = {},
): void {
  emitTrackingEvent(event, (payload ?? {}) as TrackingEventPayload, context);
}

export function trackContactClick(
  channel: "phone" | "whatsapp" | "email" | "other",
  payload: TrackingEventPayload = {},
): void {
  emitTrackingEvent("landing_cta_click", { channel, ...payload }, {});
}
