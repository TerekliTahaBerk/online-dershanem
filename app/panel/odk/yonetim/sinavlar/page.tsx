import Link from "next/link";
import type { OdkExamFamily, OdkExamStatus, Prisma } from "@prisma/client";
import { ClipboardCheck, Plus, Search } from "lucide-react";
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
    prisma.odkExam.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        currentVersion: { select: { versionNumber: true, durationMinutes: true } },
        series: { select: { title: true } },
        _count: { select: { attempts: true, assignments: true } },
        attempts: { select: { status: true, submittedAt: true } },
      },
    }),
  ]);

  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK">
    <PanelPageHeader eyebrow="Denemeler" title="Sınav operasyon merkezini yönetin." description="Taslak → hazır → plan → canlı → kapandı → inceleme → yayın. Sonuçlar yönetim yayınlamadan öğrenciye açılmaz." icon={ClipboardCheck} action={<a href="#yeni-deneme" className="panel-quick-action panel-quick-action-primary"><Plus size={14} /> Yeni deneme</a>} />

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

      <div className="mt-4 overflow-x-auto rounded-3xl border border-[var(--site-line)] bg-white">
        <table className="w-full min-w-[960px] text-left text-xs">
          <thead className="bg-[var(--site-bg-warm)] text-[10px] uppercase tracking-wide text-[var(--site-muted)]">
            <tr>
              <th className="px-4 py-3">Deneme</th>
              <th className="px-3 py-3">Tür</th>
              <th className="px-3 py-3">Tarih</th>
              <th className="px-3 py-3">Süre</th>
              <th className="px-3 py-3">Öğrenci</th>
              <th className="px-3 py-3">Başlayan</th>
              <th className="px-3 py-3">Tamamlayan</th>
              <th className="px-3 py-3">Durum</th>
              <th className="px-3 py-3">Sonuç</th>
            </tr>
          </thead>
          <tbody>
            {exams.map((exam) => {
              const presentation = examStatusPresentation[exam.status];
              const started = exam.attempts.length;
              const completed = exam.attempts.filter((attempt) => attempt.status === "SUBMITTED" || attempt.status === "AUTO_SUBMITTED" || attempt.status === "REVIEW_REQUIRED").length;
              const resultLabel = exam.status === "RELEASED" ? "Yayınlandı" : exam.status === "SCORED" ? "Gizli / inceleme" : exam.status === "ENDED" ? "Puanlama bekliyor" : "—";
              return (
                <tr key={exam.id} className="border-t border-[var(--site-line)] hover:bg-[var(--site-bg-warm)]/60">
                  <td className="px-4 py-3"><Link href={`/panel/odk/yonetim/sinavlar/${exam.id}`} className="font-bold text-[var(--site-ink)] hover:text-[var(--brand-olive)]">{exam.title}</Link><p className="mt-0.5 text-[10px] text-[var(--site-muted)]">{exam.series?.title || "Serisiz"}</p></td>
                  <td className="px-3 py-3 font-extrabold text-[var(--brand-olive)]">{exam.family}</td>
                  <td className="px-3 py-3">{exam.startsAt ? date.format(exam.startsAt) : "—"}</td>
                  <td className="px-3 py-3">{exam.currentVersion?.durationMinutes ? `${exam.currentVersion.durationMinutes} dk` : "—"}</td>
                  <td className="px-3 py-3">{exam._count.assignments || started}</td>
                  <td className="px-3 py-3">{started}</td>
                  <td className="px-3 py-3">{completed}</td>
                  <td className="px-3 py-3"><OdkStatusBadge label={presentation.label} tone={presentation.tone} pulse={exam.status === "LIVE"} /></td>
                  <td className="px-3 py-3 font-bold">{resultLabel}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!exams.length ? <div className="p-8 text-center"><ClipboardCheck size={22} className="mx-auto text-[var(--site-muted)]" /><h3 className="mt-3 text-sm font-extrabold">Filtreye uygun deneme bulunamadı.</h3><p className="mt-1 text-xs text-[var(--site-muted)]">Filtreleri temizleyin veya yeni bir taslak oluşturun.</p><Link href="/panel/odk/yonetim/sinavlar" className="panel-text-link mt-3">Filtreleri temizle</Link></div> : null}
      </div>
    </section>
  </PanelShell>;
}
