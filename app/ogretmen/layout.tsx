import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelAccess } from "@/lib/panel-access";
import { PremiumSidebar } from "@/components/layout/premium-sidebar";

export default async function OgretmenLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerAuthSession();
  const access = getPanelAccess(session?.user);

  if (!session) redirect("/giris");
  if (!access.hasTeacherPanel) {
    redirect(access.defaultPanel ? (access.defaultPanel === "student" ? "/panel" : "/admin") : "/giris");
  }

  const userName = session.user?.name ?? session.user?.email ?? "Öğretmen";

  return (
    <div className="pd-app">
      <PremiumSidebar
        persona="teacher"
        userName={userName}
        userRole="Öğretmen"
      />
      <div className="pd-app-main">
        {children}
      </div>
    </div>
  );
}
