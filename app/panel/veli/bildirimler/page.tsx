import { redirect } from "next/navigation";
import { requirePanelRole } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

/**
 * Bildirimler ürün bağımsızdır — asıl ekran (`/panel/bildirimler`) yalnız
 * `requireActiveUser()` ister. Bu yönlendirici eskiden `requireRole("PARENT")`
 * kullanıyordu, o da OD ürün üyeliği şart koşar; yalnız Online Koçum veya
 * yalnız Deneme Kulübü ürünü olan bir velinin çocuğu bu sayfada 404 alırdı.
 * Panelin geri kalan yedi veli sayfasıyla aynı, ürün bağımsız kapı kullanılır.
 */
export default async function ParentNotificationsPage() {
  await requirePanelRole("PARENT");
  redirect("/panel/bildirimler");
}
