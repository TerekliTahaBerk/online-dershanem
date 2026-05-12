import type { Metadata } from "next";
import { requirePanelSession } from "@/lib/panel-access";
import { PanelShell } from "@/components/panel/shell/panel-shell";
import { getUserAccessFlags } from "@/lib/access/odk";

export const metadata: Metadata = {
  title: "Panel · OnlineDershanem",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requirePanelSession();
  // Effective role'a göre OD/ODK bayrakları (admin view-as'ta da panel
  // navigasyonu doğru görünsün diye actualRole değil effective role kullanılır;
  // ADMIN her zaman tüm bayrakları açık görür).
  const accessFlags = await getUserAccessFlags(ctx.userId, ctx.actualRole);
  return (
    <PanelShell
      role={ctx.role}
      actualRole={ctx.actualRole}
      isViewingAs={ctx.isViewingAs}
      userId={ctx.userId}
      userName={ctx.name}
      userEmail={ctx.email}
      accessFlags={accessFlags}
    >
      {children}
    </PanelShell>
  );
}
