import { MessageCircleMore, PhoneCall } from "lucide-react";
import { contact } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { FadeIn } from "@/components/ui/fade-in";
import { ContactLink } from "@/components/ui/contact-link";

export function CTASection() {
  return (
    <section id="bilgi-al" className="pb-16 pt-6 sm:pb-20">
      <Container>
        <FadeIn>
          <div className="rounded-3xl border border-line bg-white p-8 text-ink shadow-soft sm:p-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Sana Uygun Programı Birlikte Belirleyelim</h2>
            <p className="mt-4 max-w-2xl text-sm text-muted sm:text-base">
              Danışmanımız; hedef sınavını, mevcut net durumunu ve çalışma düzenini dinleyerek sana en uygun sınıf yapısını önerir.
              Böylece rastgele paket seçmek yerine, gerçekten sonuç üretecek bir planla başlarsın. Arama veya WhatsApp üzerinden
              anında bağlantı kurabilirsin.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ContactLink
                href={`tel:${contact.phone}`}
                channel="phone"
                placement="cta"
                className="inline-flex items-center justify-center rounded-full bg-anchor px-6 py-3 text-sm font-semibold text-white transition hover:bg-pine"
              >
                <PhoneCall className="mr-2 h-4 w-4" /> Hemen Ara
              </ContactLink>
              <ContactLink
                href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`}
                channel="whatsapp"
                placement="cta"
                className="inline-flex items-center justify-center rounded-full border border-line-strong px-6 py-3 text-sm font-semibold text-ink transition hover:bg-soft"
              >
                <MessageCircleMore className="mr-2 h-4 w-4" /> WhatsApp'tan Yaz
              </ContactLink>
            </div>
          </div>
        </FadeIn>
      </Container>
    </section>
  );
}
