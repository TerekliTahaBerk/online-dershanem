import { NextResponse } from "next/server";
import { requireApiActiveUser } from "@/lib/auth/api-guards";
import { listActiveUserSessions } from "@/lib/auth/session";
import { sessionDeviceLabel } from "@/lib/auth/session-device";
import type { MobileSessionList } from "@/lib/mobile-contracts/api";

/**
 * Kullanıcının etkin oturumları — `/panel/oturumlar` sayfasıyla AYNI kaynak
 * (`listActiveUserSessions`). Mobil "Oturumlar" ekranı için JSON karşılığı.
 * Token, token hash'i, IP ve ham user-agent DÖNMEZ; yalnız kısa cihaz tanımı.
 * İptal: mevcut `DELETE /api/auth/sessions/[id]` ve `POST …/others`.
 */
export async function GET() {
  const auth = await requireApiActiveUser();
  if (!auth.ok) return auth.response;
  const sessions = await listActiveUserSessions(auth.session.userId, auth.session.role);
  const body: MobileSessionList = {
    sessions: sessions.map((session) => ({
      id: session.id,
      current: session.id === auth.session.sessionId,
      createdAt: session.createdAt.toISOString(),
      lastSeenAt: session.lastSeenAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      device: sessionDeviceLabel(session.userAgent),
    })),
  };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store, private" } });
}
