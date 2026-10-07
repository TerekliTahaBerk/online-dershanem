import Link from "next/link";
import { EmptyState, PageHeader, StatusBadge, ViewTabs, buttonClass } from "@/components/panel/ui";
import { TrackedPanelLink } from "@/components/panel/tracked-panel-link";
import {
  OPS_GROUP_FILTERS,
  OPS_GROUP_LABEL,
  OPS_HEALTH_LABEL,
  OPS_SEVERITY_LABEL,
  summaryLine,
  type AdminOperationsCenterSnapshot,
  type OpsActionGroup,
  type OpsActionItem,
  type OpsHealthStatus,
  type OpsSeverity,
} from "@/lib/panel/admin-operations-center";

const TIME = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
const ACTIVITY_WHEN = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
const SEVERITY_ORDER: OpsSeverity[] = ["BLOCKING", "ACTION_REQUIRED", "WATCH"];
const HEALTH_DOT: Record<OpsHealthStatus, string> = {
  ok: "bg-(--pn-tone-success)",
  degraded: "bg-(--pn-tone-warning)",
  down: "bg-(--pn-tone-critical)",
  unknown: "bg-pn-border-strong",
};

function InboxRow({ item }: { item: OpsActionItem }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5">
      <span className="w-14 shrink-0 text-[12px] font-semibold text-pn-text-muted">{OPS_GROUP_LABEL[item.group]}</span>
      <span className="min-w-0 flex-1">
        <span className="text-[14px] font-medium text-pn-text">{item.title}</span>
        <span className="text-[14px] text-pn-text-secondary"> · {item.subject}</span>
        <span className="block text-[12.5px] text-pn-text-muted">
          {item.ageLabel} açık{item.owner ? ` · sorumlu: ${item.owner}` : ""}
        </span>
      </span>
      <TrackedPanelLink
        href={item.href}
        className={buttonClass("secondary", "sm", "shrink-0")}
        event={{ name: "admin_ops_center_action_clicked", properties: { actionCode: item.code, severity: item.severity } }}
      >
        {item.ctaLabel}
        <span className="sr-only"> · {item.title} · {item.subject}</span>
      </TrackedPanelLink>
    </li>
  );
}

/**
 * GELEN KUTUSU (docs/panel-design-roadmap.md §13) — yönetimin çapraz ürün ana
 * sayfası. Satırlar önem derecesine göre Kritik / Aksiyon / İzle başlıkları
 * altında; `?grup=` ürün/alan süzgecidir. Özet kutucukları tek "Bugün" satırı,
 * sistem sağlığı tek nokta satırıdır. Severity modeli ve kaynaklar
 * `lib/panel/admin-operations-center.ts` içinde.
 */
export function AdminOperationsCenterView({
  snapshot,
  group = "tumu",
}: {
  snapshot: AdminOperationsCenterSnapshot;
  group?: "tumu" | OpsActionGroup;
}) {
  const visible = group === "tumu" ? snapshot.actions : snapshot.actions.filter((item) => item.group === group);
  const counts = new Map<string, number>([["tumu", snapshot.actions.length]]);
  for (const item of snapshot.actions) counts.set(item.group, (counts.get(item.group) ?? 0) + 1);
  const today = summaryLine(snapshot.summary);
  const risk = [
    { label: "kritik", count: snapshot.risk.critical, href: snapshot.risk.criticalHref },
    { label: "takip edilmeli", count: snapshot.risk.watch, href: snapshot.risk.watchHref },
    { label: "normal", count: snapshot.risk.normal, href: snapshot.risk.normalHref },
  ];

  return (
    <div className="max-w-[1080px]">
      <PageHeader
        title="Gelen kutusu"
        description={`Bugün ${snapshot.openActionCount} aksiyon · ${snapshot.blockingCount} kritik · son kontrol ${TIME.format(snapshot.generatedAt)}`}
        actions={
          <Link href={group === "tumu" ? "/panel/yonetim" : `/panel/yonetim?grup=${group}`} className={buttonClass("secondary", "md")}>
            Yenile
          </Link>
        }
      />

      {snapshot.partialData ? (
        <p role="status" className="mt-2 rounded-md bg-(--pn-tone-warning-soft) px-3 py-2 text-[13.5px] text-pn-text">
          Bir veya daha fazla kaynak okunamadı; sayılar kısmi olabilir, eksik bölümler “—” ile gösterilir.
        </p>
      ) : null}

      <div className="mt-3">
        <ViewTabs
          label="Gelen kutusu süzgeci"
          activeId={group}
          tabs={OPS_GROUP_FILTERS.map((item) => ({
            id: item.id,
            label: item.label,
            href: item.id === "tumu" ? "/panel/yonetim" : `/panel/yonetim?grup=${item.id}`,
            count: counts.get(item.id) ?? 0,
          }))}
        />
      </div>

      {visible.length ? (
        <div className="mt-5 space-y-6">
          {SEVERITY_ORDER.map((severity) => {
            const rows = visible.filter((item) => item.severity === severity);
            if (!rows.length) return null;
            const presentation = OPS_SEVERITY_LABEL[severity];
            const headingId = `gelen-${severity.toLowerCase()}`;
            return (
              <section key={severity} aria-labelledby={headingId}>
                <h2 id={headingId} className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-pn-text">
                  <StatusBadge tone={presentation.tone} label={presentation.label} />
                  <span className="tabular-nums text-pn-text-muted">{rows.length}</span>
                </h2>
                <ul aria-labelledby={headingId} className="divide-y divide-pn-border-subtle rounded-lg border border-pn-border">
                  {rows.map((item) => (
                    <InboxRow key={item.id} item={item} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyState
          className="mt-5"
          title={group === "tumu" ? "Bekleyen aksiyon yok." : "Bu alanda bekleyen aksiyon yok."}
          body="Erişim açılışı, koçluk, deneme, güvenlik ve sistem sinyalleri şu anda temiz."
          action={
            <Link href="/panel/yonetim/isler" className={buttonClass("secondary", "sm")}>
              Aktivasyon masası
            </Link>
          }
        />
      )}

      <section aria-labelledby="sistem-sagligi" className="mt-8 border-t border-pn-border pt-4">
        <h2 id="sistem-sagligi" className="text-[14px] font-semibold text-pn-text">
          Sistem sağlığı
        </h2>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-[13.5px]">
          {snapshot.health.map((check) => (
            <li key={check.id}>
              <Link href={check.href} title={check.detail} className="inline-flex items-center gap-1.5 text-pn-text-secondary hover:text-pn-text">
                <span aria-hidden="true" className={`size-2 rounded-full ${HEALTH_DOT[check.status]}`} />
                {check.label}
                <span className="sr-only">: {OPS_HEALTH_LABEL[check.status]} · {check.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="bugun-satiri" className="mt-5">
        <h2 id="bugun-satiri" className="text-[14px] font-semibold text-pn-text">
          Bugün
        </h2>
        <p className="mt-1 text-[13.5px] text-pn-text-secondary">
          {today.length
            ? today.map((item, index) => (
                <span key={item.id}>
                  {index ? " · " : ""}
                  <Link href={item.href} className="underline-offset-2 hover:text-pn-text hover:underline">
                    {item.text}
                  </Link>
                </span>
              ))
            : "—"}
        </p>
        <p className="mt-1 text-[13.5px] text-pn-text-secondary">
          Risk:{" "}
          {risk.map((item, index) => (
            <span key={item.label}>
              {index ? " · " : ""}
              <Link href={item.href} className="underline-offset-2 hover:text-pn-text hover:underline">
                {item.count} {item.label}
              </Link>
            </span>
          ))}
        </p>
      </section>

      <section aria-labelledby="son-etkinlik" className="mt-6">
        <div className="flex items-baseline justify-between">
          <h2 id="son-etkinlik" className="text-[14px] font-semibold text-pn-text">
            Son etkinlik
          </h2>
          <Link href="/panel/yonetim/kayitlar" className={buttonClass("ghost", "sm")}>
            İşlem geçmişi
          </Link>
        </div>
        {snapshot.activities.length ? (
          <ul className="mt-2 divide-y divide-pn-border-subtle rounded-lg border border-pn-border">
            {snapshot.activities.map((item) => (
              <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-2 text-[13.5px]">
                {item.href ? (
                  <Link href={item.href} className="min-w-0 text-pn-text underline-offset-2 hover:underline">
                    {item.text}
                  </Link>
                ) : (
                  <span className="min-w-0 text-pn-text">{item.text}</span>
                )}
                <span className="shrink-0 text-[12.5px] text-pn-text-muted">
                  {item.actorLabel} · {ACTIVITY_WHEN.format(item.occurredAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[13.5px] text-pn-text-muted">Henüz okunabilir bir etkinlik yok.</p>
        )}
      </section>
    </div>
  );
}
