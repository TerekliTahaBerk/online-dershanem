import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiActiveUser } from "@/lib/auth/api-guards";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";
import { getAccessibleProducts } from "@/lib/auth/products";
import { productRolePath } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { checkProductPanelPilot } from "@/lib/auth/product-panels";

/**
 * Ürün paneli seçimi (OD / OK / ODK).
 *
 * Seçim oturuma yazılır (`Session.activeProduct`) ve YALNIZ menü kapsamını
 * belirler. Yine de yalnız erişilebilen bir ürün seçilebilir: sahip
 * olunmayan ürün 403 döner — aksi halde menü, açılmayacak sayfalara giden
 * bağlantılarla dolardı.
 */
const bodySchema = z.object({ product: z.enum(["OD", "OK", "ODK"]) });

export async function POST(request: Request) {
  const auth = await requireApiActiveUser();
  if (!auth.ok) return auth.response;

  const guard = await guardMutation({
    action: "panel.active_product",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:active-product:${auth.session.userId}`,
    rateLimit: { max: 60, windowMs: 15 * 60_000 },
  });
  if (!guard.ok) return mutationGuardResponse(guard);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "İstek okunamadı." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz ürün." }, { status: 400 });
  const { product } = parsed.data;

  // Gerçek oturum (preview overlay'siz): seçim aktörün oturumuna yazılır.
  const actor = await getSession();
  if (!actor) return NextResponse.json({ error: "Oturumunuz sona ermiş." }, { status: 401 });

  const products = await getAccessibleProducts(actor.userId, actor.role);
  if (!products.includes(product)) {
    return NextResponse.json({ error: "Bu ürüne erişiminiz yok." }, { status: 403 });
  }
  if (!(await checkProductPanelPilot(actor.userId, actor.role, product))) {
    return NextResponse.json({ error: "Bu panel şu anda erişime kapalı." }, { status: 403 });
  }

  await prisma.session.update({ where: { id: actor.sessionId }, data: { activeProduct: product } });
  return NextResponse.json({ redirect: productRolePath(product, actor.role) });
}
