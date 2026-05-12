/**
 * Tracking — şu an no-op stub.
 * Eski analitik/dönüşüm pixel'leri panellerle birlikte söküldü.
 * UI bileşenleri arayüzü bozulmasın diye aynı imzalar korunuyor.
 */

export type ContactChannel = "phone" | "whatsapp" | "email" | "other";

export function trackConversionEvent(
  _event: string,
  _payload?: unknown,
): void {
  // intentionally empty
}

export function trackContactClick(
  _channel: ContactChannel,
  _payload?: unknown,
): void {
  // intentionally empty
}
