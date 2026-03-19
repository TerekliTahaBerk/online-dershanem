import Image from "next/image";
import Link from "next/link";
import { contact } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { ContactLink } from "@/components/ui/contact-link";
import footerLogo from "@/public/logo.png";

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
        </div>
        <div className="flex gap-5">
          <Link href="/kvkk/" className="hover:text-mint">KVKK</Link>
          <Link href="/gizlilik/" className="hover:text-mint">Gizlilik</Link>
          <Link href="/iade/" className="hover:text-mint">İade Politikası</Link>
        </div>
      </Container>
    </footer>
  );
}
