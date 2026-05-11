import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelAccess } from "@/lib/panel-access";
import { PremiumSidebar } from "@/components/layout/premium-sidebar";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { getUnreadCount } from "@/lib/inbox";

export default async function OgretmenLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerAuthSession();
  const access = getPanelAccess(session?.user);

  if (!session) redirect("/giris");

  if (!session.user?.isAdmin) {
    if (!access.hasTeacherPanel) {
      redirect(access.defaultPanel ? (access.defaultPanel === "student" ? "/panel" : "/admin") : "/giris");
    }
    if (!access.hasOdAccess) {
      // Eğitmen ama OD erişim tag'i yok → ODK varsa oraya, yoksa paketler
      redirect(access.hasOdkPanel ? "/odk/panel" : "/paketler");
    }
  }

  const userName = session.user?.name ?? session.user?.email ?? "Öğretmen";
  const inboxUnread = session.user?.id ? await getUnreadCount(session.user.id).catch(() => 0) : 0;

  return (
    <ThemeProvider>
      <div className="pd-app">
        <PremiumSidebar
          persona="teacher"
          userName={userName}
          userRole="Öğretmen"
          hasOdkAccess={access.hasOdkPanel}
          inboxUnread={inboxUnread}
        />
        <div className="pd-app-main">
          {children}
        </div>
      </div>
    </ThemeProvider>
  );
}
