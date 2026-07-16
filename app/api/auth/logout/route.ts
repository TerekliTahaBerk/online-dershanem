import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { guardMutation } from "@/lib/security/mutation-guard";
import { clearSessionCookie, getSession, revokeSession } from "@/lib/auth/session";

/**
 * Çıkış.
 *
 * Yalnızca çerezi silmek YETMEZ — token'ı kopyalamış biri oturumu kullanmaya
 * devam edebilirdi. Oturum kaydı da iptal edilir.
 *
 * Panel kapalıyken de çalışır: açıkken giren birinin çıkabilmesi gerekir.
 */
export async function POST(request: Request) {
  const guard = await guardMutation({
    action: "auth.logout",
    requireSameOrigin: true,
    headers: { get: (name: string) => request.headers.get(name) },
  });
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: 403 });
  }

  const session = await getSession();
  if (session) {
    await revokeSession(session.sessionId);
    await logAudit({
      actorUserId: session.userId,
      entityType: "User",
      entityId: session.userId,
      action: "auth.logout",
      summary: "Çıkış yapıldı",
    });
  }

  // Oturum geçersiz olsa bile çerez temizlenir — bayat çerez kalmasın.
  await clearSessionCookie();

  return NextResponse.json({ redirect: "/giris" });
}
