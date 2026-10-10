import { requireApiAccountRole } from "@/lib/auth/api-guards";
import { MOBILE_PARENT_CONTRACT_VERSION } from "@/lib/mobile-contracts/parent";
import { parentProducts } from "@/lib/mobile/parent-views";
import { listParentVisibleChildren } from "@/lib/panel/parent-product-policy";
import { parentJson } from "@/lib/panel/parent-api";

/**
 * Velinin AKADEMİK kapsamdaki çocukları — bootstrap
 * `workspace.parent.children` ile AYNI kaynak (`listParentVisibleChildren`,
 * "academic"); ikinci bir çocuk kaydı yoktur. Yalnız kimlik, ad ve veliye
 * görünür ürün kodları döner (KPSS yok, özel profil alanı yok). Mobil seçili
 * çocuğu bu listeyle yeniden doğrular.
 */
export async function GET() {
  const auth = await requireApiAccountRole("PARENT");
  if (!auth.ok) return auth.response;
  const children = await listParentVisibleChildren(auth.session.userId, "academic");
  return parentJson({
    contractVersion: MOBILE_PARENT_CONTRACT_VERSION,
    children: children.map((child) => ({ studentId: child.id, name: child.name, products: parentProducts(child.products) })),
  });
}
