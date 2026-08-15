import Link from "next/link";
import type { OdkExamFamily, OdkExamStatus, Prisma } from "@prisma/client";
import { CalendarClock, ClipboardCheck, Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireProductRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelPageHeader } from "@/components/panel/panel-page-header";
import { OdkStatusBadge } from "@/components/odk/odk-status-badge";
import { AdminExamCreate } from "@/components/odk/admin-exam-create";
import { examStatusPresentation } from "@/lib/odk/presentation";

export const dynamic = "force-dynamic";
const families: OdkExamFamily[] = ["LGS", "TYT", "AYT"];
const statuses: OdkExamStatus[] = ["DRAFT", "READY", "SCHEDULED", "LIVE", "ENDED", "SCORED", "RELEASED", "ARCHIVED"];
const date = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });

export default async function OdkAdminExamsPage({ searchParams }: { searchParams: Promise<{ q?: string; aile?: string; durum?: string }> }) {
  const session = await requireProductRole("ODK", "ADMIN");
  const params = await searchParams;
  const family = families.includes(params.aile as OdkExamFamily) ? params.aile as OdkExamFamily : undefined;
  const status = statuses.includes(params.durum as OdkExamStatus) ? params.durum as OdkExamStatus : undefined;
  const query = params.q?.trim().slice(0, 80) || "";
  const where: Prisma.OdkExamWhereInput = { ...(family ? { family } : {}), ...(status ? { status } : {}), ...(query ? { title: { contains: query, mode: "insensitive" } } : {}) };
  const [series, exams] = await Promise.all([
    prisma.odkExamSeries.findMany({ where: { isActive: true }, orderBy: [{ family: "asc" }, { title: "asc" }], select: { id: true, title: true, family: true } }),
    prisma.odkExam.findMany({ where, orderBy: { createdAt: "desc" }, include: { currentVersion: { select: { versionNumber: true } }, series: { select: { title: true } } } }),
  ]);

  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK">
    <PanelPageHeader eyebrow="Deneme planlama" title="Sınavı önce eksiksiz hazırlayın." description="Taslak, içerik kilidi, planlama, puanlama ve sonuç açıklama adımlarını kontrollü sırayla yönetin." icon={ClipboardCheck} action={<a href="#yeni-deneme" className="panel-quick-action panel-quick-action-primary"><Plus size={14} /> Yeni deneme</a>} />

    <section id="yeni-deneme" className="mt-7 scroll-mt-28"><AdminExamCreate series={series} /></section>

    <section className="mt-9">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-lg font-extrabold text-[var(--site-ink)]">Denemeler</h2><p className="mt-1 text-xs text-[var(--site-muted)]">{exams.length} kayıt gösteriliyor</p></div>
        <form className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_130px_160px_auto]" method="get">
          <label className="panel-field"><span className="sr-only">Deneme ara</span><span className="relative"><Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--site-muted)]" /><input name="q" defaultValue={query} placeholder="Deneme ara" className="panel-input pl-9" /></span></label>
          <label className="panel-field"><span className="sr-only">Sınav ailesi</span><select name="aile" defaultValue={family || ""}><option value="">Tüm aileler</option>{families.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="panel-field"><span className="sr-only">Deneme durumu</span><select name="durum" defaultValue={status || ""}><option value="">Tüm durumlar</option>{statuses.map((item) => <option key={item} value={item}>{examStatusPresentation[item].label}</option>)}</select></label>
          <button className="panel-secondary-button">Filtrele</button>
        </form>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {exams.map((exam) => { const presentation = examStatusPresentation[exam.status]; return <Link key={exam.id} href={`/panel/odk/yonetim/sinavlar/${exam.id}`} className="panel-surface group p-5 transition hover:-translate-y-0.5 hover:border-[var(--brand-olive)] hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-[.07em] text-[var(--brand-olive)]">{exam.family} · sürüm {exam.currentVersion?.versionNumber || "—"}</p><h3 className="mt-2 truncate text-sm font-bold text-[var(--site-ink)]">{exam.title}</h3><p className="mt-1 truncate text-[10.5px] text-[var(--site-muted)]">{exam.series?.title || "Serisiz"}</p></div><OdkStatusBadge label={presentation.label} tone={presentation.tone} pulse={exam.status === "LIVE"} /></div><div className="mt-4 flex items-center gap-2 border-t border-[var(--site-line)] pt-3 text-[11px] text-[var(--site-body)]"><CalendarClock size={13} className="text-[var(--brand-olive)]" />{exam.startsAt ? date.format(exam.startsAt) : "Tarih planlanmadı"}</div></Link>; })}
        {!exams.length ? <div className="rounded-3xl border border-dashed border-[var(--site-line)] bg-white p-8 text-center md:col-span-2 xl:col-span-3"><ClipboardCheck size={22} className="mx-auto text-[var(--site-muted)]" /><h3 className="mt-3 text-sm font-extrabold">Filtreye uygun deneme bulunamadı.</h3><p className="mt-1 text-xs text-[var(--site-muted)]">Filtreleri temizleyin veya yeni bir taslak oluşturun.</p><Link href="/panel/odk/yonetim/sinavlar" className="panel-text-link mt-3">Filtreleri temizle</Link></div> : null}
      </div>
    </section>
  </PanelShell>;
}
