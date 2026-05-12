/**
 * Tip-güvenli HTTP client.
 *
 * - Base URL: `config.apiBase()` → `<host>/api/v1/mobile`
 * - Bearer JWT otomatik enjekte edilir.
 * - 401 → tek seferlik refresh denenir, başarılıysa istek replay edilir.
 * - Refresh fail → tüm token temizlenir, auth store logout çağrılır.
 *
 * Bu modül store'a doğrudan import yapmaz (cycle'ı kırmak için tokenları
 * provider üzerinden geçici state'e enjekte ederiz).
 */
import { config } from "@/constants/config";
import type { AuthTokens } from "@/types/user";
import { logger } from "@/lib/logger";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type TokenAccessor = {
  get(): AuthTokens | null;
  set(tokens: AuthTokens | null): Promise<void>;
};

let tokenAccessor: TokenAccessor | null = null;
let refreshInFlight: Promise<AuthTokens | null> | null = null;

export function bindTokenAccessor(accessor: TokenAccessor) {
  tokenAccessor = accessor;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Auth zorunlu mu? Default: true */
  auth?: boolean;
  /** İstek başına override timeout (ms). */
  timeoutMs?: number;
}

async function refreshTokens(): Promise<AuthTokens | null> {
  const current = tokenAccessor?.get();
  if (!current?.refreshToken) return null;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${config.apiBase()}/auth/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { data: AuthTokens };
      await tokenAccessor?.set(json.data);
      return json.data;
    } catch (err) {
      logger.warn("refresh failed", err);
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function performRequest<T>(
  path: string,
  opts: RequestOptions,
  attempt = 0,
): Promise<T> {
  const url = path.startsWith("http") ? path : `${config.apiBase()}${path}`;
  const headers = new Headers(opts.headers);
  headers.set("accept", "application/json");
  if (opts.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const auth = opts.auth ?? true;
  if (auth) {
    const tokens = tokenAccessor?.get();
    if (tokens?.accessToken) headers.set("authorization", `Bearer ${tokens.accessToken}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 20_000);

  let res: Response;
  try {
    res = await fetch(url, {
      ...opts,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 204) return undefined as T;

  if (res.status === 401 && auth && attempt === 0) {
    const refreshed = await refreshTokens();
    if (refreshed) return performRequest<T>(path, opts, attempt + 1);
    await tokenAccessor?.set(null);
    throw new ApiError(401, "UNAUTHENTICATED", "Oturum süresi doldu.");
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(
      res.status,
      err?.code ?? `HTTP_${res.status}`,
      err?.message ?? `İstek başarısız (${res.status}).`,
    );
  }

  return body as T;
}

export const apiClient = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "body" | "method">) =>
    performRequest<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body" | "method">) =>
    performRequest<T>(path, { ...opts, method: "POST", body }),
  put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body" | "method">) =>
    performRequest<T>(path, { ...opts, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body" | "method">) =>
    performRequest<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, "body" | "method">) =>
    performRequest<T>(path, { ...opts, method: "DELETE" }),
};
