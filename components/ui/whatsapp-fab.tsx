import { MessageCircle } from "lucide-react";
import { contact } from "@/lib/content";

/**
 * Sol-alt köşede sabit duran WhatsApp ön görüşme butonu. Tüm public sayfalarda
 * görünür; sepet butonu (cart-fab, sağ-alt) ile çakışmaması için sol-altta
 * konumlanır. Düşük niyetli ziyaretçiyi ödeme öncesi iletişime yakalamak için.
 */
export function WhatsAppFab() {
  const href = `https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp'tan ön görüşme"
      className="fixed bottom-5 left-5 z-50 hidden items-center gap-2.5 rounded-full bg-[#25D366] pl-3 pr-4 py-2.5 text-white shadow-2xl shadow-black/25 transition-all hover:bg-[#1ebe5a] lg:flex"
    >
      <MessageCircle size={20} strokeWidth={2} />
      <span className="hidden text-[13px] font-semibold leading-tight sm:block">
        WhatsApp&apos;tan sorun
      </span>
    </a>
  );
}
