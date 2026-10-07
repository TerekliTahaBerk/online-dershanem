import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { istanbulMonthStart } from "@/lib/istanbul-time";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  EmptyState,
  PageHeader,
  PanelTable,
  PanelTableRow,
  PanelTableCell,
  StatusBadge,
  ViewTabs,
  buttonClass,
} from "@/components/panel/ui";

export const dynamic = "force-dynamic";

/**
 * ADMIN · SİPARİŞLER — onaylı tasarım (Panel.dc.html → aOrders).
 *
 * Tasarımın tek cümlelik tezi başlığın altında yazılıdır ve tablonun yapısını
 * belirler: ÖDEME DURUMU ile ERİŞİM AÇMA DURUMU ayrı iki sütundur. "Alındı /
 * Başarısız" satırı bir tutarsızlık değil, operasyonun işidir.
 *
 * Bu ekran `/panel/yonetim/isler` ile ÇAKIŞMAZ: orası onboarding SLA'sı,
 * cron sağlığı, e-posta kuyruğu ve talepleri de taşıyan geniş operasyon
 * kuyruğu; burası tasarımın sipariş listesi ve sipariş detayına açılan yol.
 */

const DATE = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
});
const LIRA = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});
const PAGE_SIZE = 30;

const PAYMENT_LABEL = {
  PAID: { label: "Alındı", tone: "success" as const },
  PENDING: { label: "Bekliyor", tone: "warning" as const },
  CANCELLED: { label: "İptal", tone: "neutral" as const },
  REFUNDED: { label: "İade", tone: "neutral" as const },
};

const PROVISIONING_LABEL = {
  SUCCEEDED: { label: "Tamam", tone: "success" as const },
  PENDING: { label: "Beklemede", tone: "neutral" as const },
  RUNNING: { label: "Çalışıyor", tone: "info" as const },
  RETRY_PENDING: { label: "Yeniden denenecek", tone: "warning" as const },
  MANUAL_REVIEW: { label: "Başarısız", tone: "critical" as const },
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filtre?: string; sayfa?: string; q?: string }>;
}) {
  const session = await requireRole("ADMIN");
  const sp = await searchParams;
  const filtre = ["sorun", "ay"].includes(sp.filtre ?? "")
    ? (sp.filtre ?? "")
    : "";
  const page = Math.max(1, Number.parseInt(sp.sayfa ?? "1", 10) || 1);
  const q = (sp.q ?? "").trim().slice(0, 80);

  const monthStart = istanbulMonthStart(new Date());

  const where: Prisma.OdOrderWhereInput = {
    ...(filtre === "sorun"
      ? { status: "PAID", provisioningStatus: { not: "SUCCEEDED" } }
      : {}),
    ...(filtre === "ay" ? { createdAt: { gte: monthStart } } : {}),
    ...(q
      ? {
          OR: [
            { packageName: { contains: q, mode: "insensitive" as const } },
            { user: { fullName: { contains: q, mode: "insensitive" as const } } },
            { user: { email: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [total, orders, problemCount] = await Promise.all([
    prisma.odOrder.count({ where }),
    prisma.odOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        packageName: true,
        status: true,
        provisioningStatus: true,
        totalCents: true,
        createdAt: true,
        user: { select: { fullName: true, email: true } },
        lines: { select: { productName: true }, orderBy: { position: "asc" } },
      },
    }),
    prisma.odOrder.count({
      where: { status: "PAID", provisioningStatus: { not: "SUCCEEDED" } },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const listHref = (patch: { filtre?: string; sayfa?: number }) => {
    const params = new URLSearchParams();
    const nextFilter = patch.filtre ?? filtre;
    if (nextFilter) params.set("filtre", nextFilter);
    if (q) params.set("q", q);
    if (patch.sayfa && patch.sayfa > 1) params.set("sayfa", String(patch.sayfa));
    const text = params.toString();
    return text ? `/panel/yonetim/siparisler?${text}` : "/panel/yonetim/siparisler";
  };

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Siparişler"
    >
      <div className="max-w-[1080px]">
        <PageHeader title="Siparişler" description="Ödeme durumu ile erişim açma durumu ayrı izlenir; ödenmiş ama erişimi açılmamış sipariş operasyonun işidir." />

        <div className="mt-2">
          <ViewTabs
            label="Sipariş görünümleri"
            activeId={filtre || "tumu"}
            tabs={[
              { id: "sorun", label: "Erişim sorunu", href: listHref({ filtre: "sorun" }), count: problemCount },
              { id: "tumu", label: "Tümü", href: q ? `/panel/yonetim/siparisler?q=${encodeURIComponent(q)}` : "/panel/yonetim/siparisler" },
              { id: "ay", label: "Bu ay", href: listHref({ filtre: "ay" }) },
            ]}
          />
        </div>

        <form method="get" className="mt-4 flex flex-wrap items-end gap-2">
          {filtre ? <input type="hidden" name="filtre" value={filtre} /> : null}
          <label className="grid min-w-[200px] flex-1 gap-1 text-[12.5px] font-medium text-pn-text-muted sm:max-w-xs">
            Ara
            <input name="q" defaultValue={q} placeholder="Paket, ad veya e-posta" className="min-h-9 rounded-md border border-pn-border-strong bg-white px-3 text-[14px] text-pn-text" />
          </label>
          <button className={buttonClass("secondary", "sm", "min-h-9")}>Ara</button>
        </form>

        {orders.length === 0 ? (
          <EmptyState
            className="mt-5"
            title={
              filtre === "sorun"
                ? "Erişim sorunu olan sipariş yok."
                : "Sipariş yok."
            }
            body={
              filtre === "sorun"
                ? "Ödenmiş bütün siparişlerin ürün erişimi açılmış görünüyor."
                : "Sipariş oluştuğunda ödeme ve erişim durumu burada izlenir."
            }
          />
        ) : (
          <div className="mt-4">
            <PanelTable
              caption="Siparişler · ödeme ve erişim durumu"
              columns={[
                "Sipariş",
                "Öğrenci",
                "Ürünler",
                "Ödeme",
                "Erişim açma",
                "Tarih",
                "",
              ]}
            >
              {orders.map((order) => {
                const payment = PAYMENT_LABEL[order.status];
                const provisioning =
                  PROVISIONING_LABEL[order.provisioningStatus];
                return (
                  <PanelTableRow key={order.id}>
                    <PanelTableCell>
                      <Link
                        href={`/panel/yonetim/siparisler/${order.id}`}
                        className="font-medium text-pn-text underline-offset-2 hover:underline"
                      >
                        {order.packageName}
                      </Link>
                      <span className="mt-0.5 block text-[12.5px] tabular-nums text-pn-text-muted">
                        {LIRA.format(order.totalCents / 100)}
                      </span>
                    </PanelTableCell>
                    <PanelTableCell>
                      {order.user?.fullName ||
                        order.user?.email ||
                        "Bağlanmadı"}
                    </PanelTableCell>
                    <PanelTableCell>
                      {order.lines.length
                        ? order.lines.map((l) => l.productName).join(" + ")
                        : "—"}
                    </PanelTableCell>
                    <PanelTableCell>
                      <StatusBadge tone={payment.tone} label={payment.label} />
                    </PanelTableCell>
                    <PanelTableCell>
                      {order.status === "PAID" ? <StatusBadge tone={provisioning.tone} label={provisioning.label} /> : <span className="text-pn-text-muted">—</span>}
                    </PanelTableCell>
                    <PanelTableCell>
                      {DATE.format(order.createdAt)}
                    </PanelTableCell>
                    <PanelTableCell>
                      <Link href={`/panel/yonetim/siparisler/${order.id}`} className={buttonClass("ghost", "sm")}>
                        Aç<span className="sr-only"> · {order.packageName}</span>
                      </Link>
                    </PanelTableCell>
                  </PanelTableRow>
                );
              })}
            </PanelTable>

            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 text-[13px] text-pn-text-muted">
              <span>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}{" "}
                / {total}
              </span>
              {pageCount > 1 ? (
                <nav className="flex items-center gap-2" aria-label="Sayfalama">
                  {page > 1 ? (
                    <Link
                      href={listHref({ sayfa: page - 1 })}
                      className={buttonClass("secondary", "sm")}
                    >
                      Önceki
                    </Link>
                  ) : null}
                  <span>
                    Sayfa {page} / {pageCount}
                  </span>
                  {page < pageCount ? (
                    <Link
                      href={listHref({ sayfa: page + 1 })}
                      className={buttonClass("secondary", "sm")}
                    >
                      Sonraki
                    </Link>
                  ) : null}
                </nav>
              ) : null}
            </div>
          </div>
        )}

        <p className="mt-5 text-[12.5px] text-pn-text-muted">
          Onboarding SLA'sı, cron sağlığı, talepler ve e-posta kuyruğu için{" "}
          <Link
            href="/panel/yonetim/isler"
            className="font-medium text-pn-text underline underline-offset-2"
          >
            aktivasyon masasına
          </Link>{" "}
          bak.
        </p>
      </div>
    </PanelShell>
  );
}
