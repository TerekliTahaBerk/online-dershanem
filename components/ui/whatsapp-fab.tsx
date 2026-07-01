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
      className="fixed bottom-5 left-5 z-50 hidden h-12 w-12 items-center justify-center rounded-[10px] bg-[#25D366] text-white shadow-[0_12px_30px_-14px_rgba(20,20,15,0.45)] transition-colors hover:bg-[#1ebe5a] lg:flex"
    >
      <MessageCircle size={20} strokeWidth={2} />
      <span className="sr-only">
        WhatsApp&apos;tan sorun
      </span>
    </a>
  );
}
