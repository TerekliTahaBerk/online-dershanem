import Image from "next/image";
import Link from "next/link";
import { contact } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { ContactLink } from "@/components/ui/contact-link";
import { PaymentTrustStrip } from "@/components/sections/payment-trust-strip";
import footerLogo from "@/public/logo.png";
import instagramLogo from "@/instagram-removebg-preview.png";
import tiktokLogo from "@/tik-tok-removebg-preview.png";

export function Footer() {
  return (
    <footer className="border-t border-mint/20 bg-anchor py-10 text-paper">
      <Container className="flex flex-col gap-6 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/" className="inline-flex items-center" aria-label="Online Dershanem Ana Sayfa">
            <Image src={footerLogo} alt="Online Dershanem" width={220} height={52} className="h-10 w-auto rounded-md" />
          </Link>
          <p className="mt-2">
            İletişim:{" "}
            <ContactLink href={`tel:${contact.phone}`} channel="phone" placement="footer_phone" className="font-semibold text-paper underline">
              {contact.phone}
            </ContactLink>
          </p>
          <p>E-posta: {contact.email}</p>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-mint">
            Butik sınıf yapısı, canlı ders disiplini ve düzenli analiz sistemiyle öğrencinin performansını sürdürülebilir biçimde
            yükseltmeyi hedefler.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Link
              href="https://www.instagram.com/onlinedershanem.tr/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Online Dershanem Instagram"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 transition hover:bg-white/10"
            >
              <Image src={instagramLogo} alt="Instagram" width={24} height={24} className="h-5 w-5 object-contain" />
            </Link>
            <Link
              href="https://www.tiktok.com/@onlinedershanem.tr"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Online Dershanem TikTok"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 transition hover:bg-white/10"
            >
              <Image src={tiktokLogo} alt="TikTok" width={24} height={24} className="h-5 w-5 object-contain" />
            </Link>
          </div>
        </div>
        <div className="flex gap-5">
          <Link href="/kvkk/" className="hover:text-mint">KVKK</Link>
          <Link href="/gizlilik/" className="hover:text-mint">Gizlilik</Link>
          <Link href="/iade/" className="hover:text-mint">İade Politikası</Link>
        </div>
      </Container>
      <Container className="mt-4">
        <PaymentTrustStrip />
      </Container>
    </footer>
  );
}
