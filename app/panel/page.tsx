import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { postAuthenticationPath } from "@/lib/auth/products";

/**
 * ROL YÖNLENDİRİCİ — burası bir sayfa değildir.
 *
 * "Kişi mailine göre atalı olduğu panele atılır" davranışı tam olarak burada
 * gerçekleşir: oturumdaki rol okunur, kullanıcı kendi paneline gönderilir.
 */
export default async function PanelRouterPage() {
  const session = await requireSession();
  redirect(await postAuthenticationPath(session));
}
