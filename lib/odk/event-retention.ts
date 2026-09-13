/**
 * Integrity event retention — ayrıntılı eventler sınırlı süre; answers/scores kalıcı.
 */

export const ODK_INTEGRITY_EVENT_RETENTION_DAYS = 180;

/** High-value answer/lifecycle eventleri daha uzun tutulabilir; visibility/copy düşük öncelik. */
const PURGEABLE_EVENT_TYPES = [
  "TAB_HIDDEN",
  "TAB_VISIBLE",
  "WINDOW_BLUR",
  "WINDOW_FOCUS",
  "FULLSCREEN_ENTER",
  "FULLSCREEN_EXIT",
  "COPY_ATTEMPT",
  "PASTE_ATTEMPT",
  "CONTEXT_MENU",
  "NETWORK_OFFLINE",
  "NETWORK_ONLINE",
] as const;

export function integrityEventRetentionCutoff(now = new Date(), days = ODK_INTEGRITY_EVENT_RETENTION_DAYS) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function purgeableIntegrityEventTypes(): string[] {
  return [...PURGEABLE_EVENT_TYPES];
}
