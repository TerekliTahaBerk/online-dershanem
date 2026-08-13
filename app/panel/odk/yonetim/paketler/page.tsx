import { AlertTriangle, CalendarClock, CheckCircle2, PackageOpen, UsersRound, Video } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireProductRole } from "@/lib/auth/guards";
import { parseOdkPackagePolicy } from "@/lib/odk/product-contract";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelPageHeader } from "@/components/panel/panel-page-header";
import { OdkPanelNav } from "@/components/odk/odk-panel-nav";

export const dynamic = "force-dynamic";

const date = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });
const saleLabel = { AVAILABLE: "Satışta", SOLD_OUT: "Tükendi", PAUSED: "Duraklatıldı", CLOSED: "Kapalı" } as const;
const exceptionLabel: Record<string, string> = {
  BLOCK_NEW_ORDERS: "Yeni siparişi engelle",
  RESCHEDULE_OR_EXTEND_ACCESS: "Yeniden planla veya erişimi uzat",
  EXTEND_ACCESS: "Erişimi uzat",
  RESCHEDULE_OR_REFUND: "Yeniden planla veya iade et",
  REFUND: "İade et",
  BEFORE_FIRST_ATTEMPT: "İlk denemeden önce iade",
  NO_AUTOMATIC_REFUND: "Otomatik iade yok",
  FULL_REFUND: "Tam iade",
  ADMIN_GRANT_WITH_REASON_AND_EXPIRY: "Gerekçeli ve süreli admin erişimi",
};

function displayDate(value: string | null | undefined) {
  return value ? date.format(new Date(value)) : "Sınır yok";
}

export default async function OdkAdminPackagesPage() {
  const session = await requireProductRole("ODK", "ADMIN");
  const packages = await prisma.odkPackage.findMany({
    orderBy: [{ isActive: "desc" }, { title: "asc" }],
    include: {
      examLinks: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { exam: { include: { series: { select: { title: true } } } } } },
      _count: { select: { orders: true, entitlements: true } },
    },
  });

  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK" nav={<OdkPanelNav role={session.role} />}>
    <PanelPageHeader eyebrow="Ticari ürün sözleşmesi" title="Paketin ne verdiğini tek bakışta görün." description="Satış, erişim, raporlama, canlı hizmet ve istisna kuralları ile deneme eşlemeleri aynı makine-okunur sözleşmeden gösterilir." icon={PackageOpen} />
    <section className="mt-7 space-y-5">
      {packages.map((pkg) => {
        const parsed = parseOdkPackagePolicy(pkg.contractPolicy);
        return <article key={pkg.id} className="panel-surface overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-[var(--site-line)] p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[var(--brand-olive-soft)] px-2.5 py-1 text-[10px] font-extrabold text-[var(--brand-olive)]">v{pkg.contractVersion}</span>{parsed.success ? <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${parsed.data.sales.state === "AVAILABLE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{saleLabel[parsed.data.sales.state]}</span> : <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-extrabold text-rose-800"><AlertTriangle size={11} /> Geçersiz sözleşme</span>}</div><h2 className="mt-2 text-lg font-extrabold text-[var(--site-ink)]">{pkg.title}</h2><p className="mt-1 text-xs text-[var(--site-muted)]">/{pkg.slug} · {(pkg.priceCents / 100).toLocaleString("tr-TR")} ₺ · {pkg._count.orders} sipariş · {pkg._count.entitlements} hak</p></div>
            <div className="text-left sm:text-right"><p className="text-[10px] font-bold uppercase text-[var(--site-muted)]">Deneme kapsamı</p><p className="mt-1 text-2xl font-black text-[var(--site-ink)]">{pkg.examLinks.length}</p></div>
          </div>
          {parsed.success ? <>
            <dl className="grid gap-px bg-[var(--site-line)] sm:grid-cols-2 xl:grid-cols-4">
              <div className="bg-white p-4"><dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-[var(--site-muted)]"><CalendarClock size={13} /> Erişim</dt><dd className="mt-2 text-xs font-bold text-[var(--site-ink)]">{parsed.data.access.starts === "PURCHASED_AT" ? "Satın alındığında" : displayDate(parsed.data.access.startsAt)}</dd><dd className="mt-1 text-[10.5px] text-[var(--site-muted)]">{parsed.data.access.durationDays ? `${parsed.data.access.durationDays} gün` : displayDate(parsed.data.access.endsAt)}</dd></div>
              <div className="bg-white p-4"><dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-[var(--site-muted)]"><UsersRound size={13} /> Rapor hakları</dt><dd className="mt-2 text-xs font-bold text-[var(--site-ink)]">Öğrenci {parsed.data.rights.studentReports ? "✓" : "—"} · Veli {parsed.data.rights.parentReports ? "✓" : "—"} · Öğretmen {parsed.data.rights.teacherReports ? "✓" : "—"}</dd></div>
              <div className="bg-white p-4"><dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-[var(--site-muted)]"><Video size={13} /> Canlı hizmet</dt><dd className="mt-2 text-xs font-bold text-[var(--site-ink)]">{parsed.data.rights.liveService ? "Dahil" : "Dahil değil"}</dd></div>
              <div className="bg-white p-4"><dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-[var(--site-muted)]"><CheckCircle2 size={13} /> İstisna politikası</dt><dd className="mt-2 text-[10.5px] leading-5 text-[var(--site-body)]">Tükenme: {exceptionLabel[parsed.data.exceptions.soldOut]}<br />Kesinti: {exceptionLabel[parsed.data.exceptions.outage]}<br />İptal: {exceptionLabel[parsed.data.exceptions.cancellation]}<br />İade: {exceptionLabel[parsed.data.exceptions.refund]}<br />Özel erişim: {exceptionLabel[parsed.data.exceptions.exceptionalAccess]}</dd></div>
            </dl>
            <div className="p-5 sm:p-6"><h3 className="text-xs font-extrabold text-[var(--site-ink)]">Paket → hak → deneme eşlemesi</h3><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="text-[10px] uppercase text-[var(--site-muted)]"><tr><th className="pb-2">Deneme</th><th className="pb-2">Takvim</th><th className="pb-2">Geç giriş</th><th className="pb-2">Hak</th><th className="pb-2">Sonuç / anahtar</th><th className="pb-2">Meet</th></tr></thead><tbody className="divide-y divide-[var(--site-line)]">{pkg.examLinks.map(({ exam }) => <tr key={exam.id}><td className="py-3 pr-3"><strong className="block text-[var(--site-ink)]">{exam.title}</strong><span className="text-[10px] text-[var(--site-muted)]">{exam.series?.title || "Serisiz"} · {exam.family}</span></td><td className="py-3 pr-3">{exam.startsAt ? date.format(exam.startsAt) : "Planlanmadı"}<br />{exam.endsAt ? date.format(exam.endsAt) : "—"}</td><td className="py-3 pr-3">{exam.lateEntryMinutes} dk</td><td className="py-3 pr-3">{exam.attemptLimit} deneme</td><td className="py-3 pr-3">{exam.resultsReleasedAt ? date.format(exam.resultsReleasedAt) : "Planlanmadı"}<br />{exam.answerKeyReleasedAt ? date.format(exam.answerKeyReleasedAt) : "Planlanmadı"}</td><td className="py-3">{exam.meetRequired && parsed.data.rights.liveService ? "Gerekli" : "Yok"}</td></tr>)}</tbody></table>{!pkg.examLinks.length ? <p className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-800">Bu paket deneme vermiyor; satışa açılamaz.</p> : null}</div></div>
          </> : <p className="p-5 text-sm text-rose-800">Sözleşme şemaya uymuyor. Satış ve yeni provisioning engellenir.</p>}
        </article>;
      })}
      {!packages.length ? <p className="rounded-3xl border border-dashed border-[var(--site-line)] p-10 text-center text-sm text-[var(--site-muted)]">Henüz ODK paketi tanımlanmadı.</p> : null}
    </section>
  </PanelShell>;
}
