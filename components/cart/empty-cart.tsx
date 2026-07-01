import Link from "next/link";
import { ArrowRight, MessageCircle, ShoppingBag } from "lucide-react";
import { contact } from "@/lib/content";

const whatsappHref = `https://wa.me/${contact.whatsapp.replace(/[^\d]/g, "")}`;

/**
 * Boş sepet görünümü — server-render edilebilir (client state'e bağlı değil).
 *
 * `/sepet` sayfasının ilk HTML'inde fallback olarak basılır; JS yüklenmeden veya
 * sepet boşken kullanıcı anlamlı bir ekran görür (skeleton flash yok).
 */
export function EmptyCart() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-24 text-center sm:px-8">
      <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-[16px] border border-[var(--od-line)] bg-[var(--od-paper)]">
        <ShoppingBag size={36} className="text-[var(--od-olive)]" strokeWidth={1.6} />
      </div>
      <h1 className="mt-6 font-display text-[34px] leading-tight tracking-tight text-[var(--od-ink)]">
        Sepetiniz boş.
      </h1>
      <p className="mt-2 text-[14.5px] text-[var(--od-ink-soft)]">
        Matematik Ders Paketini inceleyerek başlayabilirsiniz.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/matematik-ders-paketi/"
          className="inline-flex min-h-12 items-center gap-2 rounded-[10px] bg-[var(--od-olive)] px-6 py-3 text-[13.5px] font-medium text-[var(--od-cream)] transition-colors hover:bg-[#2C3A21]"
        >
          Paketi İncele
          <ArrowRight size={14} />
        </Link>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center gap-2 rounded-[10px] border border-[var(--od-ink)] bg-[var(--od-cream)] px-6 py-3 text-[13.5px] font-medium text-[var(--od-ink)] transition-colors hover:bg-[var(--od-cream-2)]"
        >
          <MessageCircle size={14} aria-hidden="true" />
          WhatsApp&apos;tan sorun
        </a>
      </div>
    </div>
  );
}
