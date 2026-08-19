import type { OdkOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/auth/guards";
import { productLabel } from "@/lib/auth/roles";
import { resolveParentScope } from "@/lib/panel/parent-scope";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelCard, PanelCardTitle, PanelHeading } from "@/components/panel/ui";
import { requestPackageMeeting } from "./actions";

export const dynamic = "force-dynamic";

/**
 * VELİ · HESAP VE PAKET — onaylı tasarım (Panel.dc.html → pAcc).
 *
 * Üç kart: bağlı öğrenciler (her birinin KENDİ ürünleriyle), ödemeler ve
 * paket değişikliği görüşme talebi.
 *
 * Bu ekran öğrenci seçicisi KULLANMAZ: tasarımda da hesap ekranı bütün
 * çocukları birlikte listeler. Yine de her satırın ürünleri o çocuğun kendi
 * üyeliklerinden gelir (§ parent-scope), velinin toplamından değil.
 *
 * Tasarımdaki "Tutarlar fiyat tablosu bağlandığında görünür" notu artık
 * gereksiz — gerçek sipariş tutarları mevcut, o yüzden tutar gösterilir.
 */

const MONTH = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" });
const LIRA = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });

/* Enum ile yazıldı: şemaya yeni bir durum eklenirse burası derleme hatası verir. */
const ORDER_STATUS: Record<OdkOrderStatus, { label: string; tone: string }> = {
  PAID: { label: "Ödendi", tone: "text-dc-brand-hover" },
  PENDING: { label: "Ödeme bekleniyor", tone: "text-[#A5764A]" },
  REFUNDED: { label: "İade edildi", tone: "text-dc-ink-muted" },
  CANCELLED: { label: "İptal", tone: "text-dc-ink-muted" },
};

export default async function ParentAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ talep?: string }>;
}) {
  const session = await requirePanelRole("PARENT");
  const { talep } = await searchParams;
  const { children } = await resolveParentScope(session.userId);

  const orders = await prisma.odOrder.findMany({
    where: { userId: session.userId },
    select: {
      id: true,
      packageName: true,
      status: true,
      totalCents: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Hesap ve paket"
    >
      <div className="max-w-[800px]">
        <PanelHeading title="Hesap ve paket" />

        {talep === "alindi" ? (
          <p
            role="status"
            className="mt-4 rounded-[10px] border border-dc-brand-soft-line bg-dc-brand-soft px-4 py-3 text-[13.5px] font-semibold text-dc-brand-hover"
          >
            Görüşme talebin alındı. Eğitim koordinatörü seninle iletişime geçecek.
          </p>
        ) : null}

        <PanelCard className="mt-[22px]">
          <PanelCardTitle>Bağlı öğrenciler</PanelCardTitle>
          {children.length === 0 ? (
            <p className="mt-3 text-[14px] leading-[1.6] text-dc-ink-muted">
              Hesabına bağlı öğrenci görünmüyor. Bağlantı eksikse eğitim
              koordinatörünle görüşebilirsin.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {children.map((child) => (
                <li
                  key={child.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 text-[14.5px] font-medium text-dc-ink-body"
                >
                  <span>{child.name}</span>
                  <span className="text-dc-ink-muted">
                    {child.products.length
                      ? child.products.map(productLabel).join(" · ")
                      : "Aktif ürün yok"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard className="mt-4">
          <PanelCardTitle>Ödemeler</PanelCardTitle>
          {orders.length === 0 ? (
            <p className="mt-3 text-[14px] leading-[1.6] text-dc-ink-muted">
              Bu hesapta kayıtlı bir sipariş görünmüyor.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {orders.map((order) => {
                const state = ORDER_STATUS[order.status];
                return (
                  <li
                    key={order.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 text-[14px] font-medium text-dc-ink-body"
                  >
                    <span>
                      {MONTH.format(order.createdAt)} · {order.packageName}
                    </span>
                    <span className={state.tone}>
                      {LIRA.format(order.totalCents / 100)} · {state.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </PanelCard>

        {children.length > 0 ? (
          <PanelCard className="mt-4">
            <PanelCardTitle>Paket değişikliği</PanelCardTitle>
            <p className="mt-2 text-[14.5px] leading-[1.65] text-dc-ink-body">
              Bir öğrenci için ürün eklemek veya paketi değiştirmek istersen
              görüşme talebi oluşturabilirsin. Paket fiyatı, ürünleri ayrı
              almaktan daha düşük olur.
            </p>
            <form action={requestPackageMeeting} className="mt-3.5 flex flex-wrap items-end gap-2.5">
              <label className="flex flex-col gap-1.5">
                <span className="text-[12.5px] text-dc-ink-faint">Öğrenci</span>
                <select
                  name="studentId"
                  required
                  className="rounded-[10px] border border-[#DDE4E0] bg-white px-3 py-2.5 text-[13.5px] font-semibold text-dc-ink"
                >
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="rounded-[10px] border border-[#DDE4E0] bg-white px-[18px] py-[11px] text-[13.5px] font-bold text-dc-ink transition-colors hover:border-dc-brand"
              >
                Görüşme talebi oluştur
              </button>
            </form>
          </PanelCard>
        ) : null}
      </div>
    </PanelShell>
  );
}
