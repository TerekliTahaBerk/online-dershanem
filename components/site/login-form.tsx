import Link from "next/link";
import { ArrowRight, CalendarCheck, MessageCircle, ShieldCheck } from "lucide-react";
import { waHref } from "@/lib/site-content";

const supportItems = [
  {
    icon: CalendarCheck,
    title: "Ders bağlantısı ve program",
    body: "Canlı ders saatiniz, grup bilginiz veya bağlantınız için ekibimize yazın.",
  },
  {
    icon: ShieldCheck,
    title: "Ödeme ve paket desteği",
    body: "Mevcut paketiniz, ödeme kaydınız veya devam süreciniz için yardımcı olalım.",
  },
];

/**
 * Gerçek bir öğrenci paneli henüz bulunmadığı için parola istemeyen, açık ve
 * güvenli destek yüzeyi. Kullanıcıdan çalışmayan bir formda kimlik bilgisi
 * toplamaz; doğrudan çalışan destek kanallarına yönlendirir.
 */
export function LoginForm() {
  return (
    <div className="mt-10">
      <div className="grid gap-3 text-left sm:grid-cols-2">
        {supportItems.map(({ icon: Icon, title, body }) => (
          <article key={title} className="rounded-[22px] border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[var(--brand-orange-ink)] shadow-sm">
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-[15px] font-bold text-[var(--site-ink)]">{title}</h2>
            <p className="mt-2 text-[13.5px] leading-6 text-[var(--site-body)]">{body}</p>
          </article>
        ))}
      </div>

      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="site-btn site-btn-primary site-btn-lg mt-5 w-full"
      >
        <MessageCircle size={18} aria-hidden="true" />
        WhatsApp’tan destek al
      </a>
      <Link href="/iletisim/" className="site-btn site-btn-secondary site-btn-lg mt-3 w-full">
        İletişim seçeneklerini gör
        <ArrowRight size={17} aria-hidden="true" />
      </Link>
    </div>
  );
}
