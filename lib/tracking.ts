"use client";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    ttq?: {
      track: (event: string, payload?: Record<string, unknown>) => void;
    };
  }
}

export type ContactChannel = "phone" | "whatsapp";
export type ConversionEventName =
  | "hero_cta_click"
  | "trial_cta_click"
  | "pricing_cta_click"
  | "sticky_cta_click"
  | "landing_cta_click"
  | "purchase_cta_click"
  | "lead_funnel_open"
  | "lead_funnel_step"
  | "lead_funnel_complete"
  | "purchase_funnel_open"
  | "purchase_funnel_step"
  | "purchase_funnel_complete";

export function trackConversionEvent(eventName: ConversionEventName, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const eventPayload = { ...payload };
  window.dataLayer?.push({ event: eventName, ...eventPayload });

  if (window.gtag) {
    window.gtag("event", eventName, eventPayload);
  }

  if (window.fbq) {
    window.fbq("trackCustom", eventName, eventPayload);
  }

  if (window.ttq) {
    window.ttq.track(eventName, eventPayload);
  }
}

export function trackContactClick(channel: ContactChannel, placement: string) {
  const payload = {
    channel,
    placement,
    value: 1,
    currency: "TRY"
  };

  if (typeof window === "undefined") {
    return;
  }

  window.dataLayer?.push({ event: "contact_click", ...payload });

  if (window.gtag) {
    window.gtag("event", "generate_lead", {
      event_category: "contact",
      event_label: `${channel}_${placement}`,
      ...payload
    });
  }

  if (window.fbq) {
    window.fbq("trackCustom", "ContactClick", payload);
    window.fbq("track", "Lead", payload);
  }

  if (window.ttq) {
    window.ttq.track("ContactClick", payload);
    window.ttq.track("SubmitForm", payload);
  }

  trackConversionEvent("trial_cta_click", { channel, placement, source: "contact_link" });
}
