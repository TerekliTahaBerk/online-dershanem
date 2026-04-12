import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { OgretmenSidebar } from "@/components/ogretmen/ogretmen-sidebar";

export default async function OgretmenLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerAuthSession();

  if (!session) redirect("/giris");
  if (session.user?.role === "ADMIN") redirect("/admin");
  if (session.user?.role === "STUDENT") redirect("/panel");
  if (session.user?.role !== "TEACHER") redirect("/giris");

  return (
    <div className="flex min-h-screen bg-[#F7F5F0]">
      <OgretmenSidebar />
      <div className="flex-1 flex flex-col min-w-0 pt-12 lg:pt-0">
        <header className="hidden lg:flex bg-white border-b border-stone-200 px-8 py-4 items-center justify-between sticky top-0 z-10">
          <div />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-stone-800">{session.user.name ?? session.user.email}</p>
              <p className="text-xs text-stone-500">Öğretmen</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-semibold">
              {(session.user.name ?? session.user.email ?? "?")[0].toUpperCase()}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
