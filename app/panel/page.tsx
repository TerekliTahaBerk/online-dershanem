import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { PASSWORD_CHANGE_PATH, rolePath } from "@/lib/auth/roles";

/**
 * ROL YÖNLENDİRİCİ — burası bir sayfa değildir.
 *
 * "Kişi mailine göre atalı olduğu panele atılır" davranışı tam olarak burada
 * gerçekleşir: oturumdaki rol okunur, kullanıcı kendi paneline gönderilir.
 */
export default async function PanelRouterPage() {
  const session = await requireSession();
  redirect(session.mustChangePassword ? PASSWORD_CHANGE_PATH : rolePath(session.role));
}
