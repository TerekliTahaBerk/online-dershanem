import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelNav } from "@/components/panel/panel-nav";
import { OrderLinkForm } from "@/components/panel/order-link-form";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  const session = await requireRole("ADMIN");
  const [orders, leads, studentsRaw] = await Promise.all([
    prisma.odOrder.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { user: { select: { fullName: true, email: true } } } }),
    prisma.leadSubmission.findMany({ orderBy: { submittedAt: "desc" }, take: 30 }),
    prisma.user.findMany({ where: { role: "STUDENT", status: "ACTIVE" }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, email: true } }),
  ]);
  const students = studentsRaw.map((student) => ({ id: student.id, name: student.fullName || student.email }));
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} nav={<PanelNav role={session.role} />}>
    <header><p className="text-xs font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]">Operasyon kuyruğu</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.045em] text-[var(--site-ink)]">Siparişler ve talepler</h1><p className="mt-2 text-sm text-[var(--site-body)]">Yeni hareketleri tek yerden görün; öğrenci hesabına bağlanan sipariş veli panelinde de görünür.</p></header>
    <div className="mt-7 grid gap-6 xl:grid-cols-2"><section><h2 className="text-sm font-bold text-[var(--site-ink)]">Siparişler <span className="text-[var(--site-muted)]">({orders.length})</span></h2><div className="mt-3 space-y-2">{orders.map((order) => <div key={order.id} className="rounded-2xl border border-[var(--site-line)] bg-white p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-[var(--site-ink)]">{order.packageName}</p><p className="mt-1 text-xs text-[var(--site-muted)]">{order.user?.fullName || order.user?.email || "Henüz hesaba bağlanmadı"}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${order.status === "PAID" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{order.status} · {(order.totalCents / 100).toLocaleString("tr-TR")} ₺</span></div>{!order.user ? <OrderLinkForm orderId={order.id} students={students} /> : null}</div>)}{!orders.length ? <p className="rounded-2xl border border-dashed border-[var(--site-line)] p-5 text-sm text-[var(--site-muted)]">Henüz sipariş yok.</p> : null}</div></section><section><h2 className="text-sm font-bold text-[var(--site-ink)]">Talepler <span className="text-[var(--site-muted)]">({leads.length})</span></h2><div className="mt-3 space-y-2">{leads.map((lead) => <div key={lead.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--site-line)] bg-white p-4"><div><p className="text-sm font-bold text-[var(--site-ink)]">{lead.fullName}</p><p className="mt-1 text-xs text-[var(--site-muted)]">{lead.phone} · {lead.examType} · {lead.targetGoal}</p></div><span className="rounded-full bg-[var(--brand-olive-soft)] px-2.5 py-1 text-xs font-bold text-[var(--brand-olive)]">{lead.intakeStatus}</span></div>)}{!leads.length ? <p className="rounded-2xl border border-dashed border-[var(--site-line)] p-5 text-sm text-[var(--site-muted)]">Henüz talep yok.</p> : null}</div></section></div>
  </PanelShell>;
}
