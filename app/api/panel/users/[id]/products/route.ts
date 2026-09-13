import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { revokeAllUserSessions } from "@/lib/auth/session";

const schema = z.object({ products: z.array(z.enum(["OD", "OK", "ODK"])).min(1).max(3).refine((items) => new Set(items).size === items.length) });

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.users.products.update", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:user-products:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "En az bir geçerli ürün seçin." }, { status: 400 });
  const { id } = await context.params;
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, productMemberships: { where: { revokedAt: null }, select: { product: true } } } });
  if (!user) return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
  if (user.role === "ADMIN" || user.role === "TEACHER") return NextResponse.json({ error: "Yönetici ve öğretmenler üç ürüne de erişir." }, { status: 400 });

  const next = new Set(parsed.data.products);
  const before = user.productMemberships.map((membership) => membership.product).sort();
  await prisma.$transaction(async (tx) => {
    for (const product of ["OD", "OK", "ODK"] as const) {
      if (next.has(product)) {
        await tx.productMembership.upsert({ where: { userId_product: { userId: id, product } }, create: { userId: id, product, source: "MANUAL", grantedById: auth.session.userId }, update: { source: "MANUAL", grantedById: auth.session.userId, startsAt: new Date(), expiresAt: null, revokedAt: null } });
      } else {
        await tx.productMembership.updateMany({ where: { userId: id, product, revokedAt: null }, data: { revokedAt: new Date() } });
      }
    }
  });
  const after = [...next].sort();
  const changed = before.join(",") !== after.join(",");
  const revoked = changed ? await revokeAllUserSessions(id) : 0;
  await logAudit({ actorUserId: auth.session.userId, entityType: "User", entityId: id, action: "panel.user_products_updated", summary: `Kullanıcı ürün erişimi güncellendi; ${revoked} oturum kapatıldı`, payload: { before, after, revoked } });
  return NextResponse.json({ products: after });
}
