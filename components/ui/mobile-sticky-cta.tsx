"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { PurchaseFunnelTrigger } from "@/components/ui/purchase-funnel-trigger";
import { contact, subjectPackageGroups } from "@/lib/content";

const lessonPkg = subjectPackageGroups[0].packages.find(
  (p) => p.subject === "Ders Paketi",
)!;

const whatsappHref = `https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`;

// Sticky bar'ın gizleneceği rotalar — sepet/checkout akışında kendi CTA'ları var.
const HIDDEN_PREFIXES = ["/sepet", "/panel", "/giris", "/kayit", "/sifremi-unuttum"];

/**
 * Mobil (lg altı) için ekranın altına sabitlenen birincil eylem barı:
 * WhatsApp · Ön Görüşme · Satın Al. Desktop'ta gizli — orada floating FAB'lar
 * (WhatsAppFab / CartFab) görünür. Çakışmayı önlemek için FAB'lar `hidden lg:flex`.
 */
export function MobileStickyCta() {
  const pathname = usePathname();
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--od-line)] bg-[#FBFAF5]/95 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp'tan sorun"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white"
        >
          <MessageCircle size={20} strokeWidth={2} aria-hidden="true" />
        </a>
        <Link
          href="/iletisim/"
          className="flex h-11 flex-1 items-center justify-center rounded-full border border-[var(--od-ink)]/15 bg-white px-3 text-[13.5px] font-semibold text-[var(--od-ink)]"
        >
          Ön Görüşme
        </Link>
        <PurchaseFunnelTrigger
          source="mobile_sticky_cta"
          packageName={lessonPkg.name}
          category={lessonPkg.category}
          subject={lessonPkg.subject}
          priceLabel={lessonPkg.discountedPrice}
          paymentLink=""
          className="flex h-11 flex-1 items-center justify-center rounded-full bg-[var(--od-olive)] px-3 text-[13.5px] font-bold text-white"
        >
          Satın Al
        </PurchaseFunnelTrigger>
      </div>
    </div>
  );
}
