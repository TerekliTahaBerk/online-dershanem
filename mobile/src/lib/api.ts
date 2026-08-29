/**
 * Web panelinin `app/api/panel/**` ve `app/api/auth/**` uç noktalarına ince
 * bir istemci — mobil ikinci bir backend KURMUYOR (mobil inşa promptu §2.1).
 * Kimlik doğrulama `Authorization: Bearer <token>` ile taşınır
 * (`lib/auth/session.ts` → `resolveToken`, web reposunda).
 */

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
};

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string')
      ? data.error
      : `İstek başarısız oldu (${response.status}).`;
    const code = data && typeof data === 'object' && 'code' in data && typeof data.code === 'string' ? data.code : undefined;
    throw new ApiError(message, response.status, code);
  }

  return data as T;
}

export async function login(email: string, password: string): Promise<{ token: string; redirect: string }> {
  // Sunucu yalnız `X-Od-Client: mobile` işaretiyle gelen isteklere ham
  // token'ı gövdede döner (`app/api/auth/login/route.ts`, web reposu) —
  // web akışı bu işareti hiç göndermediği için çerez davranışı etkilenmez.
  const result = await apiFetch<{ token?: string; redirect: string }>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    headers: { 'X-Od-Client': 'mobile' },
  });
  if (!result.token) throw new ApiError('Sunucu token döndürmedi.', 500);
  return { token: result.token, redirect: result.redirect };
}

export async function logout(token: string): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST', token });
}
