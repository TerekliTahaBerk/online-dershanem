import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelAccess } from "@/lib/panel-access";
import { PremiumSidebar } from "@/components/layout/premium-sidebar";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { getUnreadCount } from "@/lib/inbox";

export const dynamic = "force-dynamic";

/**
 * Veli paneli layout'u — Faz 1 sonrası: PremiumSidebar (persona="parent")
 * + inbox unread badge + erişim guard'ı.
 */
export default async function VeliLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerAuthSession();

  if (!session) {
    redirect("/giris?callbackUrl=%2Fveli");
  }

  const access = getPanelAccess(session.user);

  if (!access.hasParentPanel) {
    if (access.hasAdminPanel) redirect("/admin");
    if (access.hasStudentPanel) redirect("/panel");
    if (access.hasTeacherPanel) redirect("/ogretmen");
    redirect("/paketler");
  }

  const userName = session.user?.name ?? session.user?.email ?? "Veli";
  const inboxUnread = session.user?.id ? await getUnreadCount(session.user.id).catch(() => 0) : 0;

  return (
    <ThemeProvider>
      <div className="pd-app">
        <PremiumSidebar
          persona="parent"
          userName={userName}
          userRole="Veli"
          inboxUnread={inboxUnread}
        />
        <div className="pd-app-main">{children}</div>
      </div>
    </ThemeProvider>
  );
}
