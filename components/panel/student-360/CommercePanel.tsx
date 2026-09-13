import Link from "next/link";
import { PanelCard, PanelCardTitle } from "@/components/panel/ui";
import { STUDENT_360_PACKAGE_STATUS_LABELS } from "@/lib/panel/student-360";
import { DATE, DAY, EmptyLine } from "./shared";
import type { CommercePanelProps } from "./types";

export function CommercePanel(props: CommercePanelProps) {
  const { data, adminActions } = props;
  return (
    <div className="space-y-5">
      <PanelCard>
        <PanelCardTitle>Paket durumu</PanelCardTitle>
        <p className="mt-2 text-[14px] font-semibold text-dc-ink">
          {STUDENT_360_PACKAGE_STATUS_LABELS[data.packageStatus]}
        </p>
        <dl className="mt-4 space-y-2 text-[13.5px] text-dc-ink-body">
          {data.memberships.map((membership) => (
            <div key={membership.product} className="flex justify-between gap-3">
              <dt>{membership.label}</dt>
              <dd>
                {membership.expiresAt
                  ? `Bitiş ${DAY.format(membership.expiresAt)}`
                  : "Süresiz / dönem tanımsız"}
              </dd>
            </div>
          ))}
          {!data.memberships.length ? <EmptyLine text="Aktif ürün üyeliği yok." /> : null}
        </dl>
      </PanelCard>

      <PanelCard>
        <PanelCardTitle>Siparişler ve provisioning</PanelCardTitle>
        <div className="mt-3 space-y-3">
          {data.orders.map((order) => (
            <article key={order.id} className="rounded-[10px] border border-dc-line-soft p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[13.5px] font-bold text-dc-ink">{order.packageName}</p>
                  <p className="mt-1 text-[12px] text-dc-ink-faint">
                    {DATE.format(order.createdAt)} · {(order.totalCents / 100).toLocaleString("tr-TR")} ₺
                  </p>
                </div>
                <Link
                  href={`/panel/yonetim/siparisler/${order.id}`}
                  className="text-[12.5px] font-semibold text-dc-brand hover:underline"
                >
                  Siparişi aç
                </Link>
              </div>
              <p className="mt-2 text-[12.5px] text-dc-ink-muted">
                Ödeme: {order.status} · Erişim: {order.provisioningStatus}
              </p>
              {order.provisioningError ? (
                <p className="mt-2 text-[12px] text-[#C2493D]">{order.provisioningError}</p>
              ) : null}
            </article>
          ))}
          {!data.orders.length ? <EmptyLine text="Sipariş kaydı yok." /> : null}
        </div>
      </PanelCard>

      {adminActions}
    </div>
  );
}
