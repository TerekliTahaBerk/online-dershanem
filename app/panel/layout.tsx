import type { Metadata } from "next";
import { requirePanelSession } from "@/lib/panel-access";
import { PanelShell } from "@/components/panel/shell/panel-shell";

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
  return (
    <PanelShell
      role={ctx.role}
      actualRole={ctx.actualRole}
      isViewingAs={ctx.isViewingAs}
      userId={ctx.userId}
      userName={ctx.name}
      userEmail={ctx.email}
    >
      {children}
    </PanelShell>
  );
}
