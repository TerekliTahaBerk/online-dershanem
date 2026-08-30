import { notFound } from "next/navigation";
import { Inbox } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { getInterventionConcernTargets, getInterventionInbox } from "@/lib/intervention-inbox-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { InterventionInbox } from "@/components/panel/intervention-inbox";

export const dynamic = "force-dynamic";
export default async function TeacherInterventionPage() {
  const session = await requireRole("TEACHER"); if (!getPanelFeatureFlags().interventionInbox) notFound();
  const [rows, concernTargets] = await Promise.all([getInterventionInbox({ role: "TEACHER", userId: session.userId }), getInterventionConcernTargets({ role: "TEACHER", userId: session.userId })]);
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email}><header><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]"><Inbox size={15} /> İnsan müdahalesi</p><h1 className="mt-2 text-[26px] font-extrabold leading-[1.25] tracking-[-0.02em]">Sinyal, sahibi ve küçük eylemiyle gelsin.</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--site-body)]">Tek günlük dalgalanma veya opak risk puanı yok. Her kayıt neden oluştuğunu açıklar; bağlamı siz doğrular, sonucu siz belirlersiniz.</p></header><div className="mt-7"><InterventionInbox rows={rows} concernTargets={concernTargets} /></div></PanelShell>;
}
