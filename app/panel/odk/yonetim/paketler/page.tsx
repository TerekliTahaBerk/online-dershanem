import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaffPermission } from "@/lib/auth/guards";
import { parseOdkPackagePolicy } from "@/lib/odk/product-contract";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  EmptyState,
  PageHeader,
  PanelTable,
  PanelTableCell,
  PanelTableRow,
  PropertyList,
  PropertyRow,
  StatusBadge,
  UrlDrawer,
} from "@/components/panel/ui";
import { examWorkspaceHref } from "@/lib/odk/staff-workspace";

export const dynamic = "force-dynamic";

const date = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });
const saleLabel = {
  AVAILABLE: "Satışta",
  SOLD_OUT: "Tükendi",
  PAUSED: "Duraklatıldı",
  CLOSED: "Kapalı",
} as const;
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

/**
 * DENEME LİGİ PAKETLERİ (docs/panel-design-roadmap.md §15, "Packages contract
 * view → table") — paket ↔ hak ↔ deneme sözleşmesi tek tabloda; satır →
 * sözleşme yan paneli (`?onizle=paket:<id>`): erişim, rapor hakları, canlı
 * hizmet, istisnalar ve deneme eşlemesi. Salt okunur; sözleşme makine-okunur
 * politikadan gösterilir.
 */
export default async function OdkAdminPackagesPage({ searchParams }: { searchParams: Promise<{ onizle?: string }> }) {
  // Deneme Ligi personel izni (ADMIN her izinde geçer); global rol tek başına yetmez.
  const session = await requireStaffPermission("odk:package:manage");
  const { onizle } = await searchParams;
  const packages = await prisma.odkPackage.findMany({
    orderBy: [{ isActive: "desc" }, { title: "asc" }],
    include: {
      examLinks: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: { exam: { include: { series: { select: { title: true } } } } },
      },
      _count: { select: { orders: true, entitlements: true } },
    },
  });
  const rows = packages.map((pkg) => ({ pkg, parsed: parseOdkPackagePolicy(pkg.contractPolicy) }));
  const drawerId = onizle?.startsWith("paket:") ? onizle.slice("paket:".length) : null;
  const drawer = drawerId ? rows.find((row) => row.pkg.id === drawerId) ?? null : null;

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK" pageTitle="Deneme Ligi paketleri">
      <PageHeader
        title="Deneme Ligi paketleri"
        description="Satış, erişim, raporlama, canlı hizmet ve istisna kuralları ile deneme eşlemeleri aynı makine-okunur sözleşmeden gösterilir."
      />
      {rows.length ? (
        <PanelTable caption="Deneme Ligi paketleri" columns={["Paket", "Sözleşme", "Satış", "Erişim", "Rapor hakları", "Canlı hizmet", "Denemeler", "Sipariş / hak"]}>
          {rows.map(({ pkg, parsed }) => (
            <PanelTableRow key={pkg.id}>
              <PanelTableCell>
                <Link href={`/panel/odk/yonetim/paketler?onizle=paket:${pkg.id}`} scroll={false} className="font-medium text-pn-text underline-offset-2 hover:underline">
                  {pkg.title}
                </Link>
                <span className="block text-[12.5px] text-pn-text-muted">
                  /{pkg.slug} · {(pkg.priceCents / 100).toLocaleString("tr-TR")} ₺{pkg.isActive ? "" : " · pasif"}
                </span>
              </PanelTableCell>
              <PanelTableCell>v{pkg.contractVersion}</PanelTableCell>
              <PanelTableCell>
                {parsed.success ? (
                  <StatusBadge tone={parsed.data.sales.state === "AVAILABLE" ? "success" : "warning"} label={saleLabel[parsed.data.sales.state]} />
                ) : (
                  <StatusBadge tone="critical" label="Geçersiz sözleşme" />
                )}
              </PanelTableCell>
              <PanelTableCell>
                {parsed.success
                  ? `${parsed.data.access.starts === "PURCHASED_AT" ? "Satın alınca" : displayDate(parsed.data.access.startsAt)} · ${parsed.data.access.durationDays ? `${parsed.data.access.durationDays} gün` : displayDate(parsed.data.access.endsAt)}`
                  : "—"}
              </PanelTableCell>
              <PanelTableCell>
                {parsed.success
                  ? [parsed.data.rights.studentReports && "Öğrenci", parsed.data.rights.parentReports && "Veli", parsed.data.rights.teacherReports && "Öğretmen"].filter(Boolean).join(" · ") || "Yok"
                  : "—"}
              </PanelTableCell>
              <PanelTableCell>{parsed.success ? (parsed.data.rights.liveService ? "Dahil" : "Dahil değil") : "—"}</PanelTableCell>
              <PanelTableCell tone={pkg.examLinks.length ? "default" : "warn"}>
                <span className="tabular-nums">{pkg.examLinks.length || "Yok"}</span>
              </PanelTableCell>
              <PanelTableCell>
                <span className="tabular-nums">
                  {pkg._count.orders} / {pkg._count.entitlements}
                </span>
              </PanelTableCell>
            </PanelTableRow>
          ))}
        </PanelTable>
      ) : (
        <EmptyState className="mt-5" title="Henüz Deneme Ligi paketi tanımlanmadı." />
      )}

      {drawer ? (
        <UrlDrawer title={drawer.pkg.title} description={`Sözleşme v${drawer.pkg.contractVersion} · /${drawer.pkg.slug}`}>
          {drawer.parsed.success ? (
            <>
              <PropertyList>
                <PropertyRow label="Satış">{saleLabel[drawer.parsed.data.sales.state]}</PropertyRow>
                <PropertyRow label="Erişim başlangıcı">
                  {drawer.parsed.data.access.starts === "PURCHASED_AT" ? "Satın alındığında" : displayDate(drawer.parsed.data.access.startsAt)}
                </PropertyRow>
                <PropertyRow label="Erişim süresi">
                  {drawer.parsed.data.access.durationDays ? `${drawer.parsed.data.access.durationDays} gün` : displayDate(drawer.parsed.data.access.endsAt)}
                </PropertyRow>
                <PropertyRow label="Rapor hakları">
                  Öğrenci {drawer.parsed.data.rights.studentReports ? "✓" : "—"} · Veli {drawer.parsed.data.rights.parentReports ? "✓" : "—"} · Öğretmen{" "}
                  {drawer.parsed.data.rights.teacherReports ? "✓" : "—"}
                </PropertyRow>
                <PropertyRow label="Canlı hizmet">{drawer.parsed.data.rights.liveService ? "Dahil" : "Dahil değil"}</PropertyRow>
                <PropertyRow label="Tükenme">{exceptionLabel[drawer.parsed.data.exceptions.soldOut]}</PropertyRow>
                <PropertyRow label="Kesinti">{exceptionLabel[drawer.parsed.data.exceptions.outage]}</PropertyRow>
                <PropertyRow label="İptal">{exceptionLabel[drawer.parsed.data.exceptions.cancellation]}</PropertyRow>
                <PropertyRow label="İade">{exceptionLabel[drawer.parsed.data.exceptions.refund]}</PropertyRow>
                <PropertyRow label="Özel erişim">{exceptionLabel[drawer.parsed.data.exceptions.exceptionalAccess]}</PropertyRow>
              </PropertyList>
              <h3 className="mt-5 text-[13.5px] font-semibold text-pn-text">Paket → hak → deneme eşlemesi</h3>
              {drawer.pkg.examLinks.length ? (
                <ol className="mt-2 divide-y divide-pn-border-subtle rounded-lg border border-pn-border text-[13px]">
                  {drawer.pkg.examLinks.map(({ exam }) => (
                    <li key={exam.id} className="px-3 py-2.5">
                      <Link href={examWorkspaceHref(exam.id)} className="font-medium text-pn-text underline-offset-2 hover:underline">
                        {exam.title}
                      </Link>
                      <span className="block text-[12.5px] text-pn-text-muted">{exam.series?.title || "Serisiz"}</span>
                      <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[12.5px]">
                        <dt className="text-pn-text-muted">Takvim</dt>
                        <dd>
                          {exam.startsAt ? date.format(exam.startsAt) : "Planlanmadı"} – {exam.endsAt ? date.format(exam.endsAt) : "—"}
                        </dd>
                        <dt className="text-pn-text-muted">Geç giriş · hak</dt>
                        <dd>
                          {exam.lateEntryMinutes} dk · {exam.attemptLimit} deneme
                        </dd>
                        <dt className="text-pn-text-muted">Sonuç / anahtar</dt>
                        <dd>
                          {exam.resultsReleasedAt ? date.format(exam.resultsReleasedAt) : "Planlanmadı"} /{" "}
                          {exam.answerKeyReleasedAt ? date.format(exam.answerKeyReleasedAt) : "Planlanmadı"}
                        </dd>
                        <dt className="text-pn-text-muted">Meet</dt>
                        <dd>{exam.meetRequired && drawer.parsed.success && drawer.parsed.data.rights.liveService ? "Gerekli" : "Yok"}</dd>
                      </dl>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-[13.5px] font-medium text-(--pn-tone-critical)">Bu paket deneme vermiyor; satışa açılamaz.</p>
              )}
            </>
          ) : (
            <p className="text-[14px] text-(--pn-tone-critical)">Sözleşme şemaya uymuyor. Satış ve yeni provisioning engellenir.</p>
          )}
        </UrlDrawer>
      ) : null}
    </PanelShell>
  );
}
