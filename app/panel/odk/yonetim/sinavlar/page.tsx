import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireProductRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { OdkPanelNav } from "@/components/odk/odk-panel-nav";
import { AdminExamCreate } from "@/components/odk/admin-exam-create";

export const dynamic = "force-dynamic";
export default async function OdkAdminExamsPage() {
  const session = await requireProductRole("ODK", "ADMIN");
  const [series, exams] = await Promise.all([prisma.odkExamSeries.findMany({ where: { isActive: true }, orderBy: [{ family: "asc" }, { title: "asc" }], select: { id: true, title: true, family: true } }), prisma.odkExam.findMany({ orderBy: { createdAt: "desc" }, include: { currentVersion: { select: { versionNumber: true } }, series: { select: { title: true } } } })]);
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK" nav={<OdkPanelNav role={session.role} />}><header><p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.1em] text-[var(--brand-olive)]"><ClipboardCheck size={15} /> Deneme planlama</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em]">Sınavı önce eksiksiz hazırlayın.</h1><p className="mt-2 text-sm text-[var(--site-body)]">Yalnız admin taslak oluşturabilir, sürümü kilitleyebilir ve planlayabilir.</p></header><div className="mt-7"><AdminExamCreate series={series} /></div><section className="mt-8"><h2 className="text-sm font-extrabold">Denemeler ({exams.length})</h2><div className="mt-3 grid gap-3 md:grid-cols-2">{exams.map((exam) => <Link key={exam.id} href={`/panel/odk/yonetim/sinavlar/${exam.id}`} className="panel-surface p-4 transition hover:border-[var(--brand-olive)]"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase text-[var(--brand-olive)]">{exam.family} · v{exam.currentVersion?.versionNumber || "—"}</p><h3 className="mt-1 text-sm font-bold">{exam.title}</h3><p className="mt-1 text-[10.5px] text-[var(--site-muted)]">{exam.series?.title || "Serisiz"}</p></div><span className="rounded-full bg-[var(--brand-olive-soft)] px-2.5 py-1 text-[10px] font-extrabold">{exam.status}</span></div></Link>)}{!exams.length ? <p className="text-sm text-[var(--site-muted)]">Henüz deneme yok.</p> : null}</div></section></PanelShell>;
}
