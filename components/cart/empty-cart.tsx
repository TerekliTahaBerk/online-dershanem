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
      <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-[20px] border border-[var(--site-line)] bg-white">
        <ShoppingBag
          size={36}
          aria-hidden="true"
          className="text-[var(--brand-orange-ink)]"
          strokeWidth={1.6}
        />
      </div>
      <h1 className="mt-6 font-display text-[clamp(2rem,4vw,2.4rem)] leading-tight tracking-[-0.02em] text-[var(--site-ink)]">
        Sepetin boş.
      </h1>
      <p className="mx-auto mt-3 max-w-[420px] text-[16px] leading-[1.6] text-[var(--site-body)]">
        Ders, koçluk ve denemeden ihtiyacın olanı seçerek paketini oluşturabilirsin.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/paketler"
          className="site-btn site-btn-primary site-btn-lg"
        >
          Paketini Oluştur
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="site-btn site-btn-secondary site-btn-lg"
        >
          <MessageCircle size={16} aria-hidden="true" />
          WhatsApp&apos;tan sor
        </a>
      </div>
    </div>
  );
}
