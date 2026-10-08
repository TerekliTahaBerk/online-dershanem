/**
 * MOBİL SÖZLEŞME — hata kodları ve M1'in kullandığı uçların yanıtları.
 * Bağımlılıksız; bkz. `bootstrap.ts` başlığındaki kural (yalnız bu dizin
 * içinden göreli tip importu serbest).
 */

import type { ContractResult } from "./bootstrap";

/**
 * Sunucunun döndürdüğü kararlı hata kodları. İstemci dallanmasını Türkçe
 * mesaja göre DEĞİL bu kodlara göre yapar. Kod taşımayan eski yanıtlar için
 * mobil istemci HTTP durumuna göre genel bir sınıf kullanır.
 */
export const MOBILE_API_ERROR_CODES = [
  "UNAUTHENTICATED",
  "PASSWORD_CHANGE_REQUIRED",
  "MFA_REQUIRED",
  "STEP_UP_REQUIRED",
  "FORBIDDEN",
  "PRODUCT_ACCESS_REQUIRED",
  "PILOT_UNAVAILABLE",
  "PILOT_PAUSED",
  "PANEL_DISABLED",
  "CLIENT_UPGRADE_REQUIRED",
  "RATE_LIMIT",
  "ORIGIN",
  "ADMIN_PREVIEW_READONLY",
] as const;
export type MobileApiErrorCode = (typeof MOBILE_API_ERROR_CODES)[number];

export type { ContractResult };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/* ---- POST /api/auth/login (X-Od-Client: mobile) ---- */

export type MobileLoginResponse = { token: string; redirect: string };

export function parseMobileLoginResponse(input: unknown): ContractResult<MobileLoginResponse> {
  if (!isRecord(input)) return { ok: false, error: "$: nesne bekleniyordu" };
  if (typeof input.token !== "string" || input.token.length < 32) return { ok: false, error: "$.token: oturum token'ı bekleniyordu" };
  if (typeof input.redirect !== "string") return { ok: false, error: "$.redirect: metin bekleniyordu" };
  return { ok: true, value: { token: input.token, redirect: input.redirect } };
}

/* ---- GET /api/panel/notifications ---- */

export const MOBILE_NOTIFICATION_TYPES = ["LESSON_SUMMARY", "ABSENCE", "ASSIGNMENT", "PAYMENT", "SYSTEM"] as const;
export type MobileNotificationType = (typeof MOBILE_NOTIFICATION_TYPES)[number];

export type MobileNotification = {
  id: string;
  type: MobileNotificationType;
  title: string;
  body: string;
  /** Web yolu; native rota için `mobile/src/navigation/route-map.ts` eşler. */
  href: string | null;
  read: boolean;
  createdAt: string;
};

export type MobileNotificationPage = {
  page: number;
  totalPages: number;
  unreadTotal: number;
  notifications: MobileNotification[];
};

export function parseNotificationPage(input: unknown): ContractResult<MobileNotificationPage> {
  if (!isRecord(input)) return { ok: false, error: "$: nesne bekleniyordu" };
  const { page, totalPages, unreadTotal, notifications } = input;
  if (![page, totalPages, unreadTotal].every((value) => typeof value === "number" && Number.isInteger(value) && value >= 0)) {
    return { ok: false, error: "$: sayfa sayıları bekleniyordu" };
  }
  if (!Array.isArray(notifications)) return { ok: false, error: "$.notifications: dizi bekleniyordu" };
  const parsed: MobileNotification[] = [];
  for (const [index, item] of notifications.entries()) {
    const path = `$.notifications[${index}]`;
    if (!isRecord(item)) return { ok: false, error: `${path}: nesne bekleniyordu` };
    if (typeof item.id !== "string" || typeof item.title !== "string" || typeof item.body !== "string") return { ok: false, error: `${path}: id/title/body bekleniyordu` };
    if (typeof item.type !== "string" || !(MOBILE_NOTIFICATION_TYPES as readonly string[]).includes(item.type)) return { ok: false, error: `${path}.type: geçersiz` };
    if (item.href !== null && typeof item.href !== "string") return { ok: false, error: `${path}.href: metin veya null bekleniyordu` };
    if (typeof item.read !== "boolean") return { ok: false, error: `${path}.read: boolean bekleniyordu` };
    if (typeof item.createdAt !== "string" || !ISO.test(item.createdAt)) return { ok: false, error: `${path}.createdAt: ISO tarih bekleniyordu` };
    parsed.push({ id: item.id, type: item.type as MobileNotificationType, title: item.title, body: item.body, href: item.href, read: item.read, createdAt: item.createdAt });
  }
  return { ok: true, value: { page: page as number, totalPages: totalPages as number, unreadTotal: unreadTotal as number, notifications: parsed } };
}

/* ---- GET /api/auth/sessions ---- */

export type MobileSessionSummary = {
  id: string;
  current: boolean;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  /** Kısaltılmış istemci tanımı (ham user-agent değil). */
  device: string;
};

export type MobileSessionList = { sessions: MobileSessionSummary[] };

export function parseSessionList(input: unknown): ContractResult<MobileSessionList> {
  if (!isRecord(input) || !Array.isArray(input.sessions)) return { ok: false, error: "$.sessions: dizi bekleniyordu" };
  const sessions: MobileSessionSummary[] = [];
  for (const [index, item] of input.sessions.entries()) {
    const path = `$.sessions[${index}]`;
    if (!isRecord(item)) return { ok: false, error: `${path}: nesne bekleniyordu` };
    if (typeof item.id !== "string" || typeof item.current !== "boolean" || typeof item.device !== "string") return { ok: false, error: `${path}: id/current/device bekleniyordu` };
    for (const key of ["createdAt", "lastSeenAt", "expiresAt"] as const) {
      const value = item[key];
      if (typeof value !== "string" || !ISO.test(value)) return { ok: false, error: `${path}.${key}: ISO tarih bekleniyordu` };
    }
    sessions.push({ id: item.id, current: item.current, device: item.device, createdAt: item.createdAt as string, lastSeenAt: item.lastSeenAt as string, expiresAt: item.expiresAt as string });
  }
  return { ok: true, value: { sessions } };
}
