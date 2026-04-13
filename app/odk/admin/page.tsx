import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelAccess } from "@/lib/panel-access";

export default async function OdkAdminPage() {
  const session = await getServerAuthSession();

  if (!session?.user) redirect("/giris");

  const access = getPanelAccess(session.user);
  if (!access.hasAdminPanel) redirect("/giris");

  return (
    <main className="min-h-screen bg-[#F7F5F0] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="rounded-[28px] border border-stone-200 bg-white p-12 shadow-xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Trophy className="h-8 w-8" />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Online Deneme Kulübü
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-stone-900">Yönetim Paneli</h1>
          <p className="mt-4 text-sm leading-relaxed text-stone-500">
            Panel geliştirme aşamasında. Çok yakında burada olacak.
          </p>
          <Link
            href="/servis-secimi"
            className="mt-8 inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Hizmet seçimine dön
          </Link>
        </div>
      </div>
    </main>
  );
}
