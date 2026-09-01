import Link from "next/link";
import {
  PanelCard,
  PanelCardTitle,
  PanelPageHeader,
  PanelStatusBadge,
  PanelActionRow,
  PanelProgress,
} from "@/components/panel/ui";
import { TrackedPanelLink } from "@/components/panel/tracked-panel-link";
import { PANEL_DOMAIN } from "@/lib/panel/domain-vocabulary";
import {
  OPS_HEALTH_LABEL,
  OPS_SEVERITY_LABEL,
  type AdminOperationsCenterSnapshot,
  type OpsHealthStatus,
  type OpsSummaryTile,
} from "@/lib/panel/admin-operations-center";

const ACTIVITY_WHEN = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

function healthTone(status: OpsHealthStatus): "success" | "warning" | "critical" | "neutral" {
  if (status === "ok") return "success";
  if (status === "degraded") return "warning";
  if (status === "down") return "critical";
  return "neutral";
}

function SummaryTileCard({ tile }: { tile: OpsSummaryTile }) {
  const content = (
    <>
      <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-dc-ink-faint">{tile.label}</p>
      <p className="mt-2 text-[28px] font-black leading-none tracking-[-0.03em] text-dc-ink">
        {tile.available ? tile.value : "—"}
      </p>
      <p className="mt-2 text-[12.5px] leading-5 text-dc-ink-muted">{tile.hint}</p>
    </>
  );

  if (!tile.available) {
    return (
      <div className="rounded-[12px] border border-dashed border-dc-line-soft bg-dc-surface-soft/60 p-4">
        {content}
      </div>
    );
  }

  return (
    <TrackedPanelLink
      href={tile.href}
      className="block rounded-[12px] border border-dc-line bg-white p-4 transition hover:border-dc-brand hover:shadow-[0_1px_0_rgba(16,24,40,0.04)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-brand"
      event={{
        name: "admin_ops_center_action_clicked",
        properties: { actionCode: "SUMMARY_TILE", severity: "NA" },
      }}
    >
      {content}
    </TrackedPanelLink>
  );
}

function ActionQueue({ snapshot }: { snapshot: AdminOperationsCenterSnapshot }) {
  if (snapshot.actions.length === 0) {
    return (
      <PanelCard>
        <PanelCardTitle>Bugün müdahale gerekenler</PanelCardTitle>
        <p className="mt-3 text-[15px] font-bold text-dc-ink">Kritik bir aksiyon yok.</p>
        <p className="mt-1.5 text-[14px] leading-[1.6] text-dc-ink-muted">
          Provisioning, davet, grup ve sistem sinyalleri şu anda temiz. Operasyon detayına inerek
          günlük akışı doğrulayabilirsiniz.
        </p>
        <Link
          href="/panel/yonetim/isler"
          className="mt-3 inline-block text-[13px] font-semibold text-dc-brand hover:underline"
        >
          Provisioning ve işleri incele
        </Link>
      </PanelCard>
    );
  }

  return (
    <PanelCard variant={snapshot.blockingCount > 0 ? "critical" : "default"}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <PanelCardTitle>Bugün müdahale gerekenler</PanelCardTitle>
          <p className="mt-1 text-[13px] text-dc-ink-muted">
            {snapshot.blockingCount} kritik · {snapshot.openActionCount} aksiyon satırı
          </p>
        </div>
      </div>
      <div className="mt-3.5 rounded-[10px] border border-dc-line-soft bg-white">
        {snapshot.actions.map((item, index) => {
          const presentation = OPS_SEVERITY_LABEL[item.severity];
          return (
            <PanelActionRow
              key={item.id}
              title={item.title}
              description={item.subject}
              meta={
                <>
                  {item.ageLabel} açık
                  {item.owner ? ` · sorumlu: ${item.owner}` : ""}
                </>
              }
              status={<PanelStatusBadge label={presentation.label} tone={presentation.tone} />}
              cta={
                <TrackedPanelLink
                  href={item.href}
                  className="panel-quick-action inline-flex"
                  event={{
                    name: "admin_ops_center_action_clicked",
                    properties: {
                      actionCode: item.code,
                      severity: item.severity,
                    },
                  }}
                >
                  {item.ctaLabel}
                </TrackedPanelLink>
              }
              last={index === snapshot.actions.length - 1}
            />
          );
        })}
      </div>
    </PanelCard>
  );
}

export function AdminOperationsCenterView({
  snapshot,
}: {
  snapshot: AdminOperationsCenterSnapshot;
}) {
  const riskTotal = Math.max(1, snapshot.risk.total);
  const riskSegments = [
    {
      key: "critical" as const,
      label: "Kritik",
      count: snapshot.risk.critical,
      href: snapshot.risk.criticalHref,
      barClass: "bg-[var(--pd-pastel-blush-ink)]",
    },
    {
      key: "watch" as const,
      label: "Takip edilmeli",
      count: snapshot.risk.watch,
      href: snapshot.risk.watchHref,
      barClass: "bg-[var(--pd-pastel-yellow-ink)]",
    },
    {
      key: "normal" as const,
      label: "Normal",
      count: snapshot.risk.normal,
      href: snapshot.risk.normalHref,
      barClass: "bg-dc-brand",
    },
  ];

  return (
    <div className="max-w-[1080px]">
      <PanelPageHeader
        eyebrow="Yönetim"
        title={PANEL_DOMAIN.operasyonMerkezi}
        description="Önce aksiyon, sonra bağlam. Bugün müdahale gerektiren kayıtları 30 saniyede tarayın."
        metadata={
          snapshot.partialData
            ? "Bazı kaynaklar eksik yüklendi — sayılar kısmi olabilir."
            : `${snapshot.openActionCount} açık aksiyon · ${snapshot.risk.total} aktif öğrenci`
        }
      />

      {snapshot.partialData ? (
        <PanelCard variant="subtle" className="mt-4">
          <p className="text-[13.5px] text-dc-ink-muted">
            Bir veya daha fazla operasyon kaynağı okunamadı. Mevcut sinyaller gösteriliyor; eksik
            bölümler “—” olarak işaretlendi.
          </p>
        </PanelCard>
      ) : null}

      <div className="mt-5">
        <ActionQueue snapshot={snapshot} />
      </div>

      <section className="mt-5" aria-labelledby="ops-summary-heading">
        <h2 id="ops-summary-heading" className="text-[16px] font-bold text-dc-ink">
          Günlük operasyon özeti
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-4">
          {snapshot.summary.map((tile) => (
            <SummaryTileCard key={tile.id} tile={tile} />
          ))}
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <PanelCard>
          <PanelCardTitle>Son aktiviteler</PanelCardTitle>
          {snapshot.activities.length === 0 ? (
            <p className="mt-3 text-[14px] text-dc-ink-muted">
              Henüz okunabilir bir aktivite yok. Yeni yönetim işlemleri burada cümle olarak
              görünecek.
            </p>
          ) : (
            <ul className="mt-3.5 divide-y divide-dc-line-soft rounded-[10px] border border-dc-line-soft">
              {snapshot.activities.map((item) => {
                const body = (
                  <>
                    <p className="text-[14px] font-medium leading-6 text-dc-ink">{item.text}</p>
                    <p className="mt-1 text-[12px] text-dc-ink-faint">
                      {item.actorLabel} · {ACTIVITY_WHEN.format(item.occurredAt)}
                    </p>
                  </>
                );
                return (
                  <li key={item.id} className="px-4 py-3">
                    {item.href ? (
                      <Link href={item.href} className="block hover:opacity-90">
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            href="/panel/yonetim/kayitlar"
            className="mt-3 inline-block text-[13px] font-semibold text-dc-brand hover:underline"
          >
            İşlem geçmişini aç
          </Link>
        </PanelCard>

        <div className="grid gap-5">
          <PanelCard>
            <PanelCardTitle>Risk dağılımı</PanelCardTitle>
            <p className="mt-1 text-[13px] text-dc-ink-muted">
              Mevcut müdahale, yardım, provisioning ve grup sinyallerinden türetilir.
            </p>
            <ul className="mt-4 flex flex-col gap-3.5">
              {riskSegments.map((segment) => {
                const pct = Math.round((segment.count / riskTotal) * 100);
                return (
                  <li key={segment.key}>
                    <div className="flex items-center justify-between gap-3 text-[13.5px]">
                      <Link href={segment.href} className="font-semibold text-dc-ink hover:underline">
                        {segment.label}
                      </Link>
                      <span className="text-dc-ink-muted">{segment.count}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-dc-line-soft">
                      <div className={`h-full rounded-full ${segment.barClass}`} style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
            {snapshot.risk.total === 0 ? (
              <p className="mt-3 text-[13px] text-dc-ink-muted">Aktif öğrenci yok — risk dağılımı boş.</p>
            ) : null}
          </PanelCard>

          <PanelCard variant="subtle">
            <PanelCardTitle>Sistem durumu</PanelCardTitle>
            <ul className="mt-3 grid grid-cols-2 gap-2 min-[420px]:grid-cols-3">
              {snapshot.health.map((check) => (
                <li key={check.id}>
                  <Link
                    href={check.href}
                    className="block rounded-[10px] border border-dc-line-soft bg-white px-3 py-2.5 hover:border-dc-brand"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-bold text-dc-ink">{check.label}</span>
                      <PanelStatusBadge
                        label={OPS_HEALTH_LABEL[check.status]}
                        tone={healthTone(check.status)}
                      />
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-4 text-dc-ink-faint">
                      {check.detail}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </PanelCard>
        </div>
      </div>

      <div className="mt-5">
        <PanelProgress
          label="Operasyon yükü"
          value={snapshot.blockingCount}
          max={Math.max(3, snapshot.openActionCount)}
          text={
            snapshot.openActionCount === 0
              ? "Kuyruk boş — operasyon sakin."
              : `${snapshot.blockingCount} kritik / ${snapshot.openActionCount} toplam aksiyon`
          }
        />
      </div>
    </div>
  );
}
