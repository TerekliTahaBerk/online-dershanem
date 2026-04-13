import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelAccess } from "@/lib/panel-access";
import { OdkAdminSidebar } from "@/components/odk/admin/odk-admin-sidebar";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function OdkAdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerAuthSession();
  const access = getPanelAccess(session?.user);

  if (!session || !access.hasAdminPanel) {
    redirect("/giris");
  }

  return (
    <div className="flex min-h-screen bg-[#F7F5F0]">
      <OdkAdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <div />
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 font-medium">
              {session.user?.name ?? session.user?.email}
            </span>
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
