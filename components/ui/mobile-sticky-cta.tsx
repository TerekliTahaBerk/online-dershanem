"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { contact } from "@/lib/content";

const whatsappHref = `https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`;

// Tasarım kararına göre bu global sticky bar yalnızca ana sayfada görünür.
// Ders Paketleri (/paketler) ve Matematik Ders Paketi (/matematik-ders-paketi)
// sayfaları kendi StickyCheckoutBar bileşenini render eder; çakışmayı önlemek
// için burada sadece "/" bırakılır.
const VISIBLE_PATHS = new Set(["/"]);

/**
 * Mobil (lg altı) için ekranın altına sabitlenen birincil eylem barı:
 * WhatsApp · Ön Görüşme · Paketler. Desktop'ta gizli — orada floating FAB'lar
 * (WhatsAppFab / CartFab) görünür. Çakışmayı önlemek için FAB'lar `hidden lg:flex`.
 */
export function MobileStickyCta() {
  const pathname = usePathname();
  if (!VISIBLE_PATHS.has(pathname)) return null;

  return (
    <>
      <div className="h-[68px] md:hidden" aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--site-line)] bg-white/95 backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-[1080px] items-center gap-2 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp'tan sorun"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white"
        >
          <MessageCircle size={20} strokeWidth={2} aria-hidden="true" />
        </a>
        <Link
          href="/iletisim/"
          className="flex h-12 flex-1 items-center justify-center rounded-full border border-[var(--site-line)] bg-white px-3 text-[13.5px] font-semibold text-[var(--site-ink)]"
        >
          Ön Görüşme
        </Link>
        <Link
          href="/ders-paketleri/"
          className="flex h-12 flex-1 items-center justify-center rounded-full bg-[var(--brand-orange)] px-3 text-[13.5px] font-semibold text-white"
        >
          Paketler
        </Link>
        </div>
      </div>
    </>
  );
}
