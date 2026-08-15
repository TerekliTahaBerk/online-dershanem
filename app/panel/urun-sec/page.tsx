import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { rolePath } from "@/lib/auth/roles";

/**
 * ESKİ ÜRÜN SEÇİCİ — artık yönlendiriciden ibaret.
 *
 * Panel TEK panele geçti: kullanıcı hangi ürünleri aldıysa alsın aynı panele
 * girer, satın alınan ürünler panelin içinde bölüm olarak açılır. "Hangi
 * panele gireceksin?" adımı kaldırıldı.
 *
 * Route, eski yer imleri ve panel içindeki eski bağlantılar kırılmasın diye
 * korunuyor.
 */
export default async function ProductSelectorRedirectPage() {
  const session = await requireSession();
  redirect(rolePath(session.role));
}
