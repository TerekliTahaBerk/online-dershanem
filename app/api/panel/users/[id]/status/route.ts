import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { guardMutation } from "@/lib/security/mutation-guard";
import { requireApiRole } from "@/lib/auth/api-guards";
import { revokeAllUserSessions } from "@/lib/auth/session";

/**
 * Hesabı askıya alma / yeniden açma.
 *
 * SİLME YOK — bilerek. Bir kullanıcıyı silmek ders notlarını, yoklamayı ve
 * ödeme bağını da götürür. Askıya alma geri alınabilir; silme alınamaz.
 *
 * İki kilitlenme tuzağı burada kapatılıyor (aşağıdaki kontroller).
 */

const schema = z.object({ status: z.enum(["ACTIVE", "SUSPENDED"]) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("ADMIN");
  if (!auth.ok) return auth.response;

  const guard = await guardMutation({
    action: "panel.users.status",
    requireSameOrigin: true,
    headers: { get: (name: string) => request.headers.get(name) },
    rateLimitKey: `panel:users:status:${auth.session.userId}`,
    rateLimit: { max: 60, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.code === "RATE_LIMIT" ? "Çok fazla işlem. Biraz sonra tekrar deneyin." : guard.message },
      { status: guard.code === "RATE_LIMIT" ? 429 : 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const { id } = await context.params;

  // TUZAK 1: Admin kendini askıya alırsa oturumu anında geçersizleşir ve
  // kendini dışarı kilitler. Geri almak için başka bir admin gerekir.
  if (id === auth.session.userId) {
    return NextResponse.json(
      { error: "Kendi hesabınızı askıya alamazsınız." },
      { status: 400 },
    );
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
  }

  // TUZAK 2: Son aktif admin askıya alınırsa panele bir daha KİMSE giremez —
  // hesabı yalnızca admin açabildiği için kurtarma yolu da kalmaz.
  if (target.role === "ADMIN" && parsed.data.status === "SUSPENDED") {
    const activeAdmins = await prisma.user.count({
      where: { role: "ADMIN", status: "ACTIVE" },
    });
    if (activeAdmins <= 1) {
      return NextResponse.json(
        { error: "Son aktif yöneticiyi askıya alamazsınız. Önce başka bir yönetici hesabı açın." },
        { status: 400 },
      );
    }
  }

  await prisma.user.update({
    where: { id: target.id },
    data: { status: parsed.data.status },
  });

  // Askıya alınan kullanıcı ANINDA dışarı atılır; açık oturumu kalmamalı.
  let revoked = 0;
  if (parsed.data.status === "SUSPENDED") {
    revoked = await revokeAllUserSessions(target.id);
  }

  await logAudit({
    actorUserId: auth.session.userId,
    entityType: "User",
    entityId: target.id,
    action: parsed.data.status === "SUSPENDED" ? "panel.user_suspended" : "panel.user_activated",
    summary:
      parsed.data.status === "SUSPENDED"
        ? `${target.email} askıya alındı; ${revoked} oturum kapatıldı`
        : `${target.email} yeniden aktifleştirildi`,
  });

  return NextResponse.json({ status: parsed.data.status });
}
