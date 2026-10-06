import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { revokeAllUserSessions } from "@/lib/auth/session";
import { applyAdminProductAccessChange } from "@/lib/products/admin-product-access-server";

const schema = z.object({ products: z.array(z.enum(["OD", "OK", "ODK"])).min(1).max(3).refine((items) => new Set(items).size === items.length) });

/**
 * Yönetim · ürün erişimi (OD / OK / ODK).
 *
 * VERİ BÜTÜNLÜĞÜ: seçili ürün listesi HEDEFTİR ama mevcut bir üyelik ASLA
 * yeniden yazılmaz. Eskiden seçili kalan her ürün `source: MANUAL, startsAt:
 * now, expiresAt: null` ile upsert ediliyordu: süreli, ödemeli bir PURCHASE
 * üyeliği formu yeniden kaydetmekle süresiz manuel üyeliğe dönüşüyor, satın
 * alma kaynağı kayboluyordu. Kural: `lib/products/admin-product-access-server.ts`.
 */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.users.products.update", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:user-products:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "En az bir geçerli ürün seçin." }, { status: 400 });
  const { id } = await context.params;
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!user) return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
  if (user.role === "ADMIN" || user.role === "TEACHER") return NextResponse.json({ error: "Yönetici ve öğretmenler üç ürüne de erişir." }, { status: 400 });

  const plan = await applyAdminProductAccessChange({ userId: id, actorUserId: auth.session.userId, requested: parsed.data.products });

  const revoked = plan.changed ? await revokeAllUserSessions(id) : 0;
  await logAudit({
    actorUserId: auth.session.userId,
    entityType: "User",
    entityId: id,
    action: "panel.user_products_updated",
    summary: `Kullanıcı ürün erişimi güncellendi; ${revoked} oturum kapatıldı`,
    payload: {
      before: plan.before,
      after: plan.after,
      granted: plan.grant,
      revokedProducts: plan.revoke,
      // Dokunulmadan korunan üyelikler (satın alma kaynağı ve penceresi dahil).
      preserved: plan.preserved,
      // Yeniden açılan ürünün önceki (iptal edilmiş / süresi dolmuş) satırı:
      // tekil anahtar satırı yeniden kullandığı için önceki değerler burada saklanır.
      replacedRows: plan.replacedRows,
      revoked,
    },
  });
  return NextResponse.json({ products: plan.after });
}
