import { requireApiAccountRole } from "@/lib/auth/api-guards";
import { productLabel } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { MOBILE_PARENT_CONTRACT_VERSION } from "@/lib/mobile-contracts/parent";
import { parentProducts } from "@/lib/mobile/parent-views";
import { listParentVisibleChildren } from "@/lib/panel/parent-product-policy";
import { parentJson } from "@/lib/panel/parent-api";

/**
 * Veli · Hesap özeti — `account` amacı (web `app/panel/veli/hesap` ile aynı):
 * akademik izni kapalı bağlantılar da ad + ürün listesiyle görünür, ama bu uç
 * HİÇBİR akademik veri döndürmez ve akademik uçları yetkilendirmez
 * (`academicAccess` yalnız bilgi; her akademik uç kendi kapısını uygular).
 * Sipariş, tutar ve ödeme ayrıntısı mobilde yoktur (MD-09).
 */
export async function GET() {
  const auth = await requireApiAccountRole("PARENT");
  if (!auth.ok) return auth.response;
  const [user, accountChildren, academicChildren] = await Promise.all([
    prisma.user.findUnique({ where: { id: auth.session.userId }, select: { fullName: true, email: true, phone: true } }),
    listParentVisibleChildren(auth.session.userId, "account"),
    listParentVisibleChildren(auth.session.userId, "academic"),
  ]);
  const academic = new Set(academicChildren.map((child) => child.id));
  return parentJson({
    contractVersion: MOBILE_PARENT_CONTRACT_VERSION,
    parent: { fullName: user?.fullName ?? null, email: user?.email ?? auth.session.email, hasPhone: Boolean(user?.phone?.trim()) },
    children: accountChildren.map((child) => ({
      studentId: child.id,
      name: child.name,
      products: parentProducts(child.products).map((code) => ({ code, label: productLabel(code) })),
      academicAccess: academic.has(child.id),
    })),
  });
}
