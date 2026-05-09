import Image from "next/image";
import Link from "next/link";
import { Instagram, Youtube, Linkedin, Send } from "lucide-react";

const COLS = [
  {
    label: "Şirket",
    links: [
      { label: "Hakkımızda", href: "/#nasil-calisir" },
      { label: "Eğitmenler", href: "/#egitmenler" },
      { label: "Blog", href: "/blog/" },
      { label: "Kariyer", href: "/seni-arayalim/" },
    ],
  },
  {
    label: "Ürün",
    links: [
      { label: "Paketler", href: "/paketler/" },
      { label: "Deneme Kulübü", href: "/deneme-kulubu/" },
      { label: "TYT · AYT", href: "/yks/" },
      { label: "LGS", href: "/lgs/" },
    ],
  },
  {
    label: "Destek",
    links: [
      { label: "S.S.S.", href: "/#sss" },
      { label: "İade Politikası", href: "/iade/" },
      { label: "Gizlilik", href: "/gizlilik/" },
      { label: "KVKK", href: "/kvkk/" },
    ],
  },
];

export function HomeFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-[var(--od-line)] bg-[var(--od-cream)]">
      {/* Faint doodle background — Opennote-style decorative bg */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <Image
          src="/v991-nt-35.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-[0.12] mix-blend-multiply"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, var(--od-cream) 0%, rgba(255,253,245,0.7) 30%, rgba(255,253,245,0.85) 100%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-6xl px-5 pt-16 pb-10 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr_auto]">
          {/* Brand: small "od." mark */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2 text-[var(--od-ink)]" aria-label="Online Dershanem">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--od-ink)] font-display text-[18px] font-normal italic text-[var(--od-yellow)]">
                od.
              </span>
              <span className="font-display text-[16px] tracking-tight">
                Online Dershanem
              </span>
            </Link>
            <p className="max-w-xs text-[13.5px] leading-6 text-[#7A7A6F]">
              Küçük gruplarda canlı ders, gerçek hocalar ve sana özel bir takvim
              ile sınava hazırlanmanın sade hâli.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLS.map((c) => (
              <div key={c.label}>
                <h4 className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#8B8B7E]">
                  {c.label}
                </h4>
                <ul className="mt-4 space-y-2.5">
                  {c.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="text-[14px] text-[var(--od-ink)] transition hover:text-[var(--od-olive)]"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2 lg:justify-end">
            <a
              href="https://instagram.com/onlinedershanem"
              aria-label="Instagram"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--od-line)] bg-white/80 text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/40"
            >
              <Instagram size={15} />
            </a>
            <a
              href="https://youtube.com/@onlinedershanem"
              aria-label="YouTube"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--od-line)] bg-white/80 text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/40"
            >
              <Youtube size={15} />
            </a>
            <a
              href="https://linkedin.com/company/onlinedershanem"
              aria-label="LinkedIn"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--od-line)] bg-white/80 text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/40"
            >
              <Linkedin size={15} />
            </a>
            <a
              href="mailto:destek@onlinedershanem.com"
              aria-label="E-posta"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--od-line)] bg-white/80 text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/40"
            >
              <Send size={15} />
            </a>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-[var(--od-line)] pt-6 text-[12.5px] text-[#7A7A6F] sm:flex-row">
          <span>© {new Date().getFullYear()} Online Dershanem. Tüm hakları saklıdır.</span>
          <span className="flex items-center gap-3">
            <Link href="/gizlilik/" className="hover:text-[var(--od-ink)]">Gizlilik</Link>
            <span className="text-[#C8C8B5]">·</span>
            <Link href="/kvkk/" className="hover:text-[var(--od-ink)]">KVKK</Link>
            <span className="text-[#C8C8B5]">·</span>
            <Link href="/iade/" className="hover:text-[var(--od-ink)]">İade</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
