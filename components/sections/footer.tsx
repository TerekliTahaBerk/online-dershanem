import Link from "next/link";
import { contact } from "@/lib/content";
import { ContactLink } from "@/components/ui/contact-link";
import { PaymentTrustStrip } from "@/components/sections/payment-trust-strip";

const productLinks = [
  { label: "Paketler", href: "/paketler/" },
  { label: "Kamplar", href: "/kamplar/" },
  { label: "Deneme Kulübü", href: "/deneme-kulubu/" },
  { label: "Blog", href: "/blog/" }
];
const corpLinks = [
  { label: "TYT-AYT Paketleri", href: "/yks/" },
  { label: "LGS Paketleri", href: "/lgs/" },
  { label: "Nasıl Çalışır?", href: "/#nasil-calisir" },
  { label: "Eğitmenler", href: "/#egitmenler" }
];
const supportLinks = [
  { label: "SSS", href: "/#sss" },
  { label: "İade Politikası", href: "/iade/" },
  { label: "Gizlilik", href: "/gizlilik/" },
  { label: "KVKK", href: "/kvkk/" }
];

export function Footer() {
  return (
    <footer className="pd-footer">
      <div className="pd-footer-inner">
        <div className="pd-footer-brand">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="pd-mnav-logo">OD</div>
            <strong>Online Dershanem</strong>
          </div>
          <p>
            Butik sınıf online dershane. Sadece ihtiyacın olan dersi seç, küçük grupta odaklı ilerle.
          </p>
          <div style={{ marginTop: 14, fontSize: 13, color: "var(--pd-ink-3)" }}>
            <ContactLink
              href={`tel:${contact.phone}`}
              channel="phone"
              placement="footer_phone"
              className="hover:text-[var(--pd-accent)]"
            >
              {contact.phone}
            </ContactLink>
            <div style={{ marginTop: 4, color: "var(--pd-muted)", fontSize: 12 }}>{contact.email}</div>
          </div>
        </div>

        <div className="pd-footer-col">
          <h5>Ürün</h5>
          {productLinks.map((l) => (
            <Link key={l.href} href={l.href}>{l.label}</Link>
          ))}
        </div>
        <div className="pd-footer-col">
          <h5>Kurumsal</h5>
          {corpLinks.map((l) => (
            <Link key={l.href} href={l.href}>{l.label}</Link>
          ))}
        </div>
        <div className="pd-footer-col">
          <h5>Destek</h5>
          {supportLinks.map((l) => (
            <Link key={l.href} href={l.href}>{l.label}</Link>
          ))}
        </div>
      </div>

      <div className="pd-footer-bottom">
        <span>© {new Date().getFullYear()} Online Dershanem · Tüm hakları saklıdır.</span>
        <span>Türkiye</span>
      </div>

      <div style={{ maxWidth: 1200, margin: "24px auto 0", padding: "0 0 8px" }}>
        <PaymentTrustStrip />
      </div>
    </footer>
  );
}
