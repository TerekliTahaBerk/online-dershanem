import "server-only";

import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { PANEL_ENABLED } from "@/lib/panel-config";
import { getSession, type SessionUser } from "@/lib/auth/session";

/**
 * API route'ları için yetki kapısı.
 *
 * `guards.ts`'ten AYRI: o dosya `redirect()`/`notFound()` kullanıyor — bunlar
 * sayfa render'ına özgü. Bir API route'unda redirect atmak, çağıran fetch'e
 * anlamsız bir HTML döndürür. Burada JSON dönüyoruz.
 *
 * Kullanım:
 *   const auth = await requireApiRole("ADMIN");
 *   if (!auth.ok) return auth.response;
 *   // auth.session güvenle kullanılabilir
 */
export type ApiAuth =
  | { ok: true; session: SessionUser }
  | { ok: false; response: NextResponse };

export async function requireApiRole(...roles: UserRole[]): Promise<ApiAuth> {
  if (!PANEL_ENABLED) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Panel şu anda kapalı." }, { status: 503 }),
    };
  }

  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Oturumunuz sona ermiş. Tekrar giriş yapın." },
        { status: 401 },
      ),
    };
  }

  // Geçici parolasını değiştirmemiş kullanıcı hiçbir iş yapamaz.
  if (session.mustChangePassword) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Devam etmeden önce parolanızı değiştirmeniz gerekiyor." },
        { status: 403 },
      ),
    };
  }

  if (!roles.includes(session.role)) {
    // Sayfalarda 404 veriyoruz; API'de 403 yeterli — burada rota keşfi diye bir şey yok.
    return {
      ok: false,
      response: NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 }),
    };
  }

  return { ok: true, session };
}
