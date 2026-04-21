import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelAccess } from "@/lib/panel-access";
import { PremiumSidebar } from "@/components/layout/premium-sidebar";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerAuthSession();
  const access = getPanelAccess(session?.user);

  if (!session) {
    redirect("/giris");
  }

  if (!access.hasStudentPanel) {
    redirect(access.defaultPanel ? (access.defaultPanel === "teacher" ? "/ogretmen" : "/admin") : "/giris");
  }

  const userName = session.user?.name ?? session.user?.email ?? "Öğrenci";

  return (
    <div className="pd-app">
      <PremiumSidebar
        persona="student"
        userName={userName}
        userRole="Öğrenci"
        hasOdkAccess={access.hasOdkPanel}
      />
      <div className="pd-app-main">
        {children}
      </div>
    </div>
  );
}
