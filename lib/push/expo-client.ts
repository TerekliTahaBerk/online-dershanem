import "server-only";

/**
 * Expo Push Service HTTP bağdaştırıcısı (resmî uçlar):
 *  - POST https://exp.host/--/api/v2/push/send        (≤100 mesaj / istek)
 *  - POST https://exp.host/--/api/v2/push/getReceipts (≤1000 kimlik / istek)
 * `EXPO_ACCESS_TOKEN` tanımlıysa "enhanced push security" için Bearer
 * gönderilir. Token, push token'ı veya yük LOGLANMAZ; hatalar yalnız kodla döner.
 */
const SEND_URL = "https://exp.host/--/api/v2/push/send";
const RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";

export type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  data: { notificationId: string };
  sound?: "default";
  priority?: "default" | "normal" | "high";
  channelId?: string;
  ttl?: number;
};

export type ExpoTicket = { status: "ok"; id: string } | { status: "error"; message?: string; details?: { error?: string } };
export type ExpoReceipt = { status: "ok" } | { status: "error"; message?: string; details?: { error?: string } };

/** İstek düzeyi sonuç: `transient` hata yeniden denenebilir (429, 5xx, ağ / zaman aşımı). */
export type ExpoRequestResult<T> = { ok: true; data: T } | { ok: false; transient: boolean; code: string; retryAfterMs: number | null };

function headers(): Record<string, string> {
  const base: Record<string, string> = { accept: "application/json", "accept-encoding": "gzip, deflate", "content-type": "application/json" };
  const token = process.env.EXPO_ACCESS_TOKEN?.trim();
  if (token) base.authorization = `Bearer ${token}`;
  return base;
}

async function post<T>(url: string, body: unknown, timeoutMs: number): Promise<ExpoRequestResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: "POST", headers: headers(), body: JSON.stringify(body), signal: controller.signal });
    if (response.status === 429 || response.status >= 500) {
      const retryAfter = Number(response.headers.get("retry-after"));
      return { ok: false, transient: true, code: `HTTP_${response.status}`, retryAfterMs: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : null };
    }
    const json = (await response.json().catch(() => null)) as { data?: T; errors?: Array<{ code?: string }> } | null;
    if (!response.ok || !json || json.data === undefined) {
      const code = json?.errors?.[0]?.code ?? `HTTP_${response.status}`;
      return { ok: false, transient: false, code: code.replace(/[^A-Z0-9_]/gi, "_").slice(0, 60), retryAfterMs: null };
    }
    return { ok: true, data: json.data };
  } catch (error) {
    // Zaman aşımı / ağ hatası: istek sağlayıcıya ulaşmış olabilir → sonuç BELİRSİZ.
    return { ok: false, transient: true, code: error instanceof Error && error.name === "AbortError" ? "TIMEOUT" : "NETWORK", retryAfterMs: null };
  } finally {
    clearTimeout(timer);
  }
}

export function sendExpoMessages(messages: ExpoMessage[], timeoutMs: number) {
  return post<ExpoTicket[]>(SEND_URL, messages, timeoutMs);
}

export function getExpoReceipts(ids: string[], timeoutMs: number) {
  return post<Record<string, ExpoReceipt>>(RECEIPTS_URL, { ids }, timeoutMs);
}

/** Expo bilet / makbuz hata kodu → teslim kararı. */
export function classifyExpoError(error: string | undefined): { permanent: boolean; revokeDevice: boolean; code: string } {
  const code = (error ?? "UNKNOWN").replace(/[^A-Za-z0-9_]/g, "_").slice(0, 60);
  switch (error) {
    case "DeviceNotRegistered":
      return { permanent: true, revokeDevice: true, code };
    case "MessageRateExceeded":
      return { permanent: false, revokeDevice: false, code };
    case "MessageTooBig":
    case "InvalidCredentials":
    case "MismatchSenderId":
    case "InvalidProviderToken":
      return { permanent: true, revokeDevice: false, code };
    default:
      return { permanent: true, revokeDevice: false, code };
  }
}

/** Expo push token biçimi (istemciden gelen değer doğrulaması). */
export const EXPO_PUSH_TOKEN = /^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]{10,200}\]$/;
