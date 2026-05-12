import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { getServerAuthSession } from "@/lib/auth";

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string; details?: unknown };

export function apiOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiOk<T>>({ ok: true, data }, init);
}

export function apiErr(message: string, status = 400, details?: unknown) {
  return NextResponse.json<ApiErr>({ ok: false, error: message, details }, { status });
}

/** Admin guard. Eğer admin değilse uygun NextResponse döner. */
export async function requireAdminApi(): Promise<
  | { ok: true; userId: string; role: UserRole }
  | { ok: false; response: NextResponse }
> {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return { ok: false, response: apiErr("Oturum gerekli.", 401) };
  }
  const role = (session.user.role ?? "STUDENT") as UserRole;
  if (role !== "ADMIN") {
    return { ok: false, response: apiErr("Admin yetkisi gerekli.", 403) };
  }
  return { ok: true, userId: session.user.id, role };
}

/** Generic auth guard — sadece login. */
export async function requireSessionApi(): Promise<
  | { ok: true; userId: string; role: UserRole }
  | { ok: false; response: NextResponse }
> {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return { ok: false, response: apiErr("Oturum gerekli.", 401) };
  }
  return {
    ok: true,
    userId: session.user.id,
    role: (session.user.role ?? "STUDENT") as UserRole,
  };
}
