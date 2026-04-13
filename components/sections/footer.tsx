import Image from "next/image";
import Link from "next/link";
import { contact } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { ContactLink } from "@/components/ui/contact-link";
import { PaymentTrustStrip } from "@/components/sections/payment-trust-strip";
import footerLogo from "@/public/logo.png";

const navGroups = [
  {
    title: "Programlar",
    links: [
      { label: "TYT-AYT Paketleri", href: "/yks/" },
      { label: "LGS Paketleri", href: "/lgs/" },
      { label: "Tüm Paketler", href: "/paketler/" },
      { label: "Kamplar", href: "/kamplar/" }
    ]
  },
  {
    title: "Keşfet",
    links: [
      { label: "Blog", href: "/blog/" },
      { label: "Nasıl Çalışır?", href: "/#nasil-calisir" },
      { label: "Eğitmenlerimiz", href: "/#egitmenler" },
      { label: "SSS", href: "/#sss" }
    ]
  },
  {
    title: "Yasal",
    links: [
      { label: "KVKK", href: "/kvkk/" },
      { label: "Gizlilik", href: "/gizlilik/" },
      { label: "İade Politikası", href: "/iade/" }
    ]
  }
];

export function Footer() {
  return (
    <footer className="border-t border-mint/15 bg-anchor">
      <Container className="py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand col */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-flex items-center" aria-label="Online Dershanem Ana Sayfa">
              <Image src={footerLogo} alt="Online Dershanem" width={220} height={52} className="h-9 w-auto rounded-md" />
            </Link>
            <p className="mt-4 max-w-xs text-xs leading-relaxed text-paper/50">
              Butik sınıf yapısı, canlı ders disiplini ve düzenli analiz sistemiyle öğrencinin performansını sürdürülebilir biçimde yükseltmeyi hedefler.
            </p>
            <div className="mt-5 space-y-1.5 text-sm text-paper/70">
              <p>
                <ContactLink
                  href={`tel:${contact.phone}`}
                  channel="phone"
                  placement="footer_phone"
                  className="font-semibold text-paper underline-offset-2 hover:text-mint hover:underline"
                >
                  {contact.phone}
                </ContactLink>
              </p>
              <p className="text-xs text-paper/50">{contact.email}</p>
              <p className="text-xs text-paper/50">{contact.address}</p>
            </div>
          </div>

          {/* Nav groups */}
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-paper/40">{group.title}</p>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-paper/60 transition-colors hover:text-mint">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>

      {/* Bottom bar */}
      <div className="border-t border-white/8">
        <Container className="py-5">
          <PaymentTrustStrip />
          <p className="mt-4 text-center text-[11px] text-paper/30">
            © {new Date().getFullYear()} Online Dershanem. Tüm hakları saklıdır.
          </p>
        </Container>
      </div>
    </footer>
  );
}
