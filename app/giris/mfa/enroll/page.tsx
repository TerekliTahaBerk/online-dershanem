import { notFound, redirect } from "next/navigation";
import { AdminMfaEnrollment } from "@/components/panel/admin-mfa-form";
import { requireSession } from "@/lib/auth/guards";
import { adminHasMfa } from "@/lib/auth/mfa";
import { PASSWORD_CHANGE_PATH } from "@/lib/auth/roles";

export default async function AdminMfaEnrollPage() {
  const session = await requireSession();
  if (session.role !== "ADMIN") notFound();
  if (session.mustChangePassword) redirect(PASSWORD_CHANGE_PATH);
  if ((await adminHasMfa(session.userId)) && !session.mfaVerifiedAt) redirect("/giris/mfa");
  return <main className="mx-auto flex min-h-screen max-w-lg items-center px-5 py-12"><section className="w-full rounded-3xl border bg-white p-7 shadow-sm"><p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Zorunlu kurulum</p><h1 className="mt-2 text-3xl font-bold">Yönetici MFA’sını kurun</h1><p className="mb-7 mt-3 text-sm leading-6 text-slate-600">Geçiş anahtarı tercih edilir. TOTP, desteklenmeyen cihazlar için güvenli bir yedektir.</p><AdminMfaEnrollment /></section></main>;
}
