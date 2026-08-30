import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { istanbulMonthStart } from "@/lib/istanbul-time";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  PanelHeading,
  PanelEmpty,
  PanelTable,
  PanelTableRow,
  PanelTableCell,
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

const DATE = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });
const LIRA = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
const PAGE_SIZE = 30;

const PAYMENT_LABEL = {
  PAID: { label: "Alındı", tone: "ok" as const },
  PENDING: { label: "Bekliyor", tone: "warn" as const },
  CANCELLED: { label: "İptal", tone: undefined },
  REFUNDED: { label: "İade", tone: undefined },
};

const PROVISIONING_LABEL = {
  SUCCEEDED: { label: "Tamam", tone: "ok" as const },
  PENDING: { label: "Beklemede", tone: undefined },
  RUNNING: { label: "Çalışıyor", tone: undefined },
  RETRY_PENDING: { label: "Yeniden denenecek", tone: "warn" as const },
  MANUAL_REVIEW: { label: "Başarısız", tone: "warn" as const },
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filtre?: string; sayfa?: string }>;
}) {
  const session = await requireRole("ADMIN");
  const sp = await searchParams;
  const filtre = ["sorun", "ay"].includes(sp.filtre ?? "") ? (sp.filtre ?? "") : "";
  const page = Math.max(1, Number.parseInt(sp.sayfa ?? "1", 10) || 1);

  const monthStart = istanbulMonthStart(new Date());

  const where: Prisma.OdOrderWhereInput = {
    ...(filtre === "sorun"
      ? { status: "PAID", provisioningStatus: { not: "SUCCEEDED" } }
      : {}),
    ...(filtre === "ay" ? { createdAt: { gte: monthStart } } : {}),
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
  const chip = (value: string, label: string) => (
    <Link
      key={value || "all"}
      href={value ? `/panel/yonetim/siparisler?filtre=${value}` : "/panel/yonetim/siparisler"}
      aria-current={filtre === value ? "true" : undefined}
      className={`rounded-lg border px-3.5 py-2.5 text-[13px] font-semibold transition-colors ${
        filtre === value
          ? "border-dc-brand bg-dc-brand-soft text-dc-brand-hover"
          : "border-[#DDE4E0] bg-white text-dc-ink-muted hover:border-dc-brand"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Siparişler"
    >
      <div className="max-w-[1080px]">
        <PanelHeading
          title="Siparişler"
          description="Ödeme durumu ile erişim açma durumu ayrı izlenir."
        />

        <div className="mt-[18px] flex flex-wrap gap-2.5">
          {chip("sorun", `Erişim sorunu (${problemCount})`)}
          {chip("", "Tümü")}
          {chip("ay", "Bu ay")}
        </div>

        {orders.length === 0 ? (
          <PanelEmpty
            title={filtre === "sorun" ? "Erişim sorunu olan sipariş yok." : "Sipariş yok."}
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
              columns={["Sipariş", "Öğrenci", "Ürünler", "Ödeme", "Erişim açma", "Tarih", ""]}
            >
              {orders.map((order) => {
                const payment = PAYMENT_LABEL[order.status];
                const provisioning = PROVISIONING_LABEL[order.provisioningStatus];
                return (
                  <PanelTableRow key={order.id}>
                    <PanelTableCell>
                      <Link
                        href={`/panel/yonetim/siparisler/${order.id}`}
                        className="text-[13.5px] font-bold text-dc-ink underline-offset-2 hover:text-dc-brand-hover hover:underline"
                      >
                        {order.packageName}
                      </Link>
                      <span className="mt-0.5 block text-[12.5px] text-dc-ink-faint">
                        {LIRA.format(order.totalCents / 100)}
                      </span>
                    </PanelTableCell>
                    <PanelTableCell>
                      {order.user?.fullName || order.user?.email || "Bağlanmadı"}
                    </PanelTableCell>
                    <PanelTableCell>
                      {order.lines.length
                        ? order.lines.map((l) => l.productName).join(" + ")
                        : "—"}
                    </PanelTableCell>
                    <PanelTableCell tone={payment.tone}>{payment.label}</PanelTableCell>
                    <PanelTableCell tone={provisioning.tone}>{provisioning.label}</PanelTableCell>
                    <PanelTableCell>{DATE.format(order.createdAt)}</PanelTableCell>
                    <PanelTableCell>
                      <Link
                        href={`/panel/yonetim/siparisler/${order.id}`}
                        className="text-[13px] font-semibold text-dc-brand hover:underline"
                      >
                        Siparişi Aç
                      </Link>
                    </PanelTableCell>
                  </PanelTableRow>
                );
              })}
            </PanelTable>

            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 text-[13px] text-dc-ink-faint">
              <span>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} / {total}
              </span>
              {pageCount > 1 ? (
                <nav className="flex items-center gap-2" aria-label="Sayfalama">
                  {page > 1 ? (
                    <Link
                      href={`/panel/yonetim/siparisler?${new URLSearchParams({ ...(filtre ? { filtre } : {}), sayfa: String(page - 1) })}`}
                      className="rounded-lg border border-[#DDE4E0] bg-white px-3 py-1.5 font-semibold text-dc-ink hover:border-dc-brand"
                    >
                      Önceki
                    </Link>
                  ) : null}
                  <span>
                    Sayfa {page} / {pageCount}
                  </span>
                  {page < pageCount ? (
                    <Link
                      href={`/panel/yonetim/siparisler?${new URLSearchParams({ ...(filtre ? { filtre } : {}), sayfa: String(page + 1) })}`}
                      className="rounded-lg border border-[#DDE4E0] bg-white px-3 py-1.5 font-semibold text-dc-ink hover:border-dc-brand"
                    >
                      Sonraki
                    </Link>
                  ) : null}
                </nav>
              ) : null}
            </div>
          </div>
        )}

        <p className="mt-5 text-[12.5px] text-dc-ink-faint">
          Onboarding SLA'sı, cron sağlığı, talepler ve e-posta kuyruğu için{" "}
          <Link href="/panel/yonetim/isler" className="font-semibold text-dc-brand hover:underline">
            işler / provisioning ekranına
          </Link>{" "}
          bak.
        </p>
      </div>
    </PanelShell>
  );
}
