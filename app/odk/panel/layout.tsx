import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { OdkStudentSidebar } from "@/components/odk/student/odk-student-sidebar";

export default async function OdkPanelLayout({ children }: { children: ReactNode }) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/giris");
  }

  // Admins can always access for testing; students need ODK access
  const isAdmin = session.user.isAdmin;
  const hasOdkAccess = session.user.hasOdkAccess;

  if (!isAdmin && !hasOdkAccess) {
    redirect("/servis-secimi");
  }

  return (
    <div className="flex min-h-screen bg-[#F7F5F0]">
      <OdkStudentSidebar />
      <div className="flex-1 flex flex-col min-w-0 pt-12 lg:pt-0">
        <header className="hidden lg:flex h-16 bg-white border-b border-gray-200 items-center justify-between px-6 shrink-0 sticky top-0 z-10">
          <Link href="/odk/panel">
            <Image src="/odklogo2.jpeg" alt="Online Deneme Kulübü" width={220} height={52} className="h-8 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
              {(session.user.name ?? session.user.email ?? "?")[0].toUpperCase()}
            </div>
            <span className="text-sm font-medium text-stone-700">
              {session.user.name ?? session.user.email}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
