import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelAccess } from "@/lib/panel-access";
import { PremiumSidebar } from "@/components/layout/premium-sidebar";
import { ThemeProvider } from "@/components/providers/theme-provider";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerAuthSession();
  const access = getPanelAccess(session?.user);

  if (!session || !access.hasAdminPanel) {
    redirect("/giris");
  }

  const userName = session.user?.name ?? session.user?.email ?? "Yönetici";

  return (
    <ThemeProvider>
      <div className="pd-app">
        <PremiumSidebar
          persona="admin"
          userName={userName}
          userRole="Yönetici"
          hasOdkAccess={true}
        />
        <div className="pd-app-main">
          {children}
        </div>
      </div>
    </ThemeProvider>
  );
}
