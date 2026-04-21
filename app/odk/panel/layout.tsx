import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { PremiumSidebar } from "@/components/layout/premium-sidebar";

export default async function OdkPanelLayout({ children }: { children: ReactNode }) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/giris");
  }

  const isAdmin = session.user.isAdmin;
  const hasOdkAccess = session.user.hasOdkAccess;
  const hasStudentPanel = session.user.hasStudentAccess;

  if (!isAdmin && !hasOdkAccess) {
    redirect("/giris");
  }

  const userName = session.user?.name ?? session.user?.email ?? "Öğrenci";

  return (
    <div className="pd-app">
      <PremiumSidebar
        persona="student"
        userName={userName}
        userRole={hasStudentPanel ? "Öğrenci" : "ODK Öğrencisi"}
        hasOdkAccess={true}
      />
      <div className="pd-app-main">
        {children}
      </div>
    </div>
  );
}
