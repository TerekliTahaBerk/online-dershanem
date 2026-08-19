import { Flag, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureSnapshot, type PanelFeatureStatus } from "@/lib/panel-feature-registry";
import { PanelShell } from "@/components/panel/panel-shell";
import { AdminPageHeader } from "@/components/panel/admin-page-header";
import { PanelCard, PanelCardTitle } from "@/components/panel/ui";

export const dynamic = "force-dynamic";

const statusLabel: Record<PanelFeatureStatus, string> = {
  experimental: "Experimental",
  pilot: "Pilot",
  "production-ready": "Production-ready",
  deprecated: "Deprecated",
};

const statusTone: Record<PanelFeatureStatus, string> = {
  experimental: "bg-dc-brand-soft text-dc-brand-deep",
  pilot: "bg-amber-100 text-amber-900",
  "production-ready": "bg-emerald-100 text-emerald-800",
  deprecated: "bg-slate-200 text-slate-700",
};

const AUDIT_WHEN = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

export default async function PanelFeatureInventoryPage() {
  const session = await requireRole("ADMIN");
  const snapshot = getPanelFeatureSnapshot();

  /*
   * SON İŞLEMLER — onaylı tasarım (Panel.dc.html → aSys, alt blok).
   * Gerçek `AuditLog` satırları; erişim ve atama değişikliklerinin izi.
   */
  const auditRows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      action: true,
      summary: true,
      entityType: true,
      actorType: true,
      actorUserId: true,
      createdAt: true,
    },
  });
  const actorIds = [...new Set(auditRows.map((r) => r.actorUserId).filter(Boolean) as string[])];
  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, fullName: true, email: true },
      })
    : [];
  const actorName = new Map(actors.map((a) => [a.id, a.fullName || a.email]));
  const enabled = snapshot.filter((feature) => feature.enabled).length;
  const drift = snapshot.filter((feature) => feature.legacyPublicDrift);

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email}>
      <AdminPageHeader eyebrow="Canlı deployment snapshot" title="Özellik yayını tek yerde görünür." description="Menü, sayfa ve API aynı sunucu flag snapshot'ını kullanır. Statü ürün olgunluğunu; Açık/Kapalı ise bu deployment'ın gerçek davranışını gösterir." icon={Flag} meta={`${enabled}/${snapshot.length} açık`} />

      <section className={`mt-7 flex items-start gap-3 rounded-[14px] border p-4 ${drift.length ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>
        {drift.length ? <TriangleAlert className="mt-0.5 shrink-0 text-rose-700" size={18} /> : <ShieldCheck className="mt-0.5 shrink-0 text-emerald-700" size={18} />}
        <div><h2 className="text-sm font-extrabold">{drift.length ? `${drift.length} eski public env değeri drift üretiyor` : "Server/client drift yok"}</h2><p className="mt-1 text-xs leading-5 text-[var(--site-body)]">İstemci görünürlüğü artık `NEXT_PUBLIC_PANEL_FEATURE_*` okumaz; `PanelShell` sunucuda çözdüğü typed snapshot'ı menüye aktarır. Eski public değişkenler tanımlıysa yalnız temizlik uyarısı olarak raporlanır.</p></div>
      </section>

      {/*
        TASARIMDAKİ YETKİ MATRİSİ UYGULANMADI.
        `Online Dershanem Panel.dc.html → aSys` dört yönetici alt rolü varsayıyor
        (Tam admin / Operasyon / Eğitim / Finans). Eğitim panelinin yetki modeli
        böyle DEĞİL: `UserRole` tek bir `ADMIN` tanır ve bütün yönetim guard'ları
        (`requireRole("ADMIN")`) bu tek role bakar. Alt rollü bir matris çizmek
        §10'un açıkça yasakladığı şey olurdu — "görsel role matrix yapıp
        backend'de farklı permission bırakma". Granüler roller yalnız İŞLETME
        çalışma alanında var (`BusinessRole` + `BusinessRoleAssignment`) ve
        oranın kendi ekranından yönetilir.
      */}
      <PanelCard className="mt-5">
        <PanelCardTitle>Yönetici yetkisi</PanelCardTitle>
        <p className="mt-2 text-[14px] leading-[1.65] text-dc-ink-body">
          Eğitim panelinde tek bir yönetici rolü vardır; her yönetici bütün
          yönetim ekranlarını görür. Alan bazlı ayrım (satış, destek, muhasebe)
          yalnız İşletme çalışma alanında tanımlıdır ve oradan yönetilir.
        </p>
        <Link
          href="/panel/yonetim/isletme/genel-bakis"
          className="mt-3.5 inline-block rounded-[10px] border border-[#DDE4E0] bg-white px-4 py-2.5 text-[13.5px] font-bold text-dc-ink transition-colors hover:border-dc-brand"
        >
          İşletme yetkilerini aç
        </Link>
      </PanelCard>

      <PanelCard className="mt-5">
        <PanelCardTitle>Son işlemler</PanelCardTitle>
        {auditRows.length === 0 ? (
          <p className="mt-3 text-[13.5px] text-dc-ink-muted">Henüz kayıtlı işlem yok.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1.5 text-[13.5px] leading-[1.7] text-dc-ink-muted">
            {auditRows.map((row) => (
              <li key={row.id}>
                {AUDIT_WHEN.format(row.createdAt)} ·{" "}
                {row.actorUserId ? (actorName.get(row.actorUserId) ?? "Bilinmeyen kullanıcı") : "Sistem"} ·{" "}
                {row.summary || `${row.entityType} · ${row.action}`}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2.5 text-[12.5px] text-dc-ink-faint">
          Erişim ve atama değişiklikleri her zaman kayıt altına alınır.{" "}
          <Link href="/panel/yonetim/kayitlar" className="font-semibold text-dc-brand hover:underline">
            Tüm işlem geçmişi
          </Link>
        </p>
      </PanelCard>

      <section className="mt-5 space-y-3" aria-label="Panel özellik envanteri">
        {snapshot.map((feature) => (
          <article key={feature.key} className="panel-surface p-5 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-extrabold text-[var(--site-ink)]">{feature.label}</h2><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${statusTone[feature.status]}`}>{statusLabel[feature.status]}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${feature.enabled ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"}`}>{feature.enabled ? "Açık" : "Kapalı"}</span></div><p className="mt-2 break-all font-mono text-[10.5px] text-[var(--site-muted)]">{feature.environmentKey} · {feature.source === "environment" ? "env ile belirlendi" : `varsayılan ${feature.defaultEnabled ? "açık" : "kapalı"}`}</p></div>
              <div className="shrink-0 text-left xl:text-right"><p className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[var(--site-muted)]">Sahip</p><p className="mt-1 text-xs font-bold text-[var(--site-ink)]">{feature.owner}</p></div>
            </div>
            <dl className="mt-5 grid gap-4 border-t border-[var(--site-line)] pt-5 md:grid-cols-2 xl:grid-cols-4">
              <div><dt className="text-[10px] font-extrabold uppercase tracking-[.07em] text-[var(--site-muted)]">Roller</dt><dd className="mt-1.5 text-xs leading-5">{feature.roles.join(" · ")}</dd></div>
              <div><dt className="text-[10px] font-extrabold uppercase tracking-[.07em] text-[var(--site-muted)]">Veri bağımlılığı</dt><dd className="mt-1.5 text-xs leading-5">{feature.dataDependency}</dd></div>
              <div><dt className="text-[10px] font-extrabold uppercase tracking-[.07em] text-[var(--site-muted)]">E2E kapsaması</dt><dd className="mt-1.5 text-xs leading-5">{feature.e2eCoverage}</dd></div>
              <div><dt className="text-[10px] font-extrabold uppercase tracking-[.07em] text-[var(--site-muted)]">Rollback</dt><dd className="mt-1.5 text-xs leading-5">{feature.rollback}</dd></div>
            </dl>
          </article>
        ))}
      </section>
    </PanelShell>
  );
}
