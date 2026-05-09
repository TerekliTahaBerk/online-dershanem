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
    <footer className="border-t border-[#E5E5E0] bg-[#FAFAF7]">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr_auto]">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2 text-[#0E0E10]">
              <Image
                src="/logo.png"
                alt=""
                width={32}
                height={32}
                className="h-7 w-7 object-contain"
              />
              <span className="font-display text-[20px] tracking-tight">
                Online Dershanem
              </span>
            </Link>
            <p className="max-w-xs text-[13.5px] leading-6 text-[#7A7A7F]">
              Küçük gruplarda canlı ders, gerçek hocalar ve sana özel bir takvim
              ile sınava hazırlanmanın sade hâli.
            </p>
          </div>

          {/* Link cols */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLS.map((c) => (
              <div key={c.label}>
                <h4 className="text-[12.5px] font-medium uppercase tracking-[0.16em] text-[#7A7A7F]">
                  {c.label}
                </h4>
                <ul className="mt-4 space-y-2.5">
                  {c.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="text-[14px] text-[#0E0E10] transition hover:text-[#3A4A2C]"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Socials */}
          <div className="flex items-start gap-2 lg:justify-end">
            <a
              href="https://instagram.com/onlinedershanem"
              aria-label="Instagram"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E5E0] bg-white text-[#0E0E10] transition hover:border-[#0E0E10]/40"
            >
              <Instagram size={15} />
            </a>
            <a
              href="https://youtube.com/@onlinedershanem"
              aria-label="YouTube"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E5E0] bg-white text-[#0E0E10] transition hover:border-[#0E0E10]/40"
            >
              <Youtube size={15} />
            </a>
            <a
              href="https://linkedin.com/company/onlinedershanem"
              aria-label="LinkedIn"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E5E0] bg-white text-[#0E0E10] transition hover:border-[#0E0E10]/40"
            >
              <Linkedin size={15} />
            </a>
            <a
              href="mailto:destek@onlinedershanem.com"
              aria-label="E-posta"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E5E0] bg-white text-[#0E0E10] transition hover:border-[#0E0E10]/40"
            >
              <Send size={15} />
            </a>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-[#E5E5E0] pt-6 text-[12.5px] text-[#7A7A7F] sm:flex-row">
          <span>© {new Date().getFullYear()} Online Dershanem. Tüm hakları saklıdır.</span>
          <span className="flex items-center gap-3">
            <Link href="/gizlilik/" className="hover:text-[#0E0E10]">Gizlilik</Link>
            <span className="text-[#C8C8C5]">·</span>
            <Link href="/kvkk/" className="hover:text-[#0E0E10]">KVKK</Link>
            <span className="text-[#C8C8C5]">·</span>
            <Link href="/iade/" className="hover:text-[#0E0E10]">İade</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
