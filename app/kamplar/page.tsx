import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Users,
  Video,
  CalendarDays,
  Target,
  Check,
  MessageCircle,
} from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { FaqAccordion } from "@/components/sections/faq-accordion";
import { SchemaJsonLd } from "@/components/seo/schema-json-ld";
import { breadcrumbJsonLd, courseJsonLd } from "@/lib/seo/jsonld";
import { contact, mathCamps, CAMP_MAX_STUDENTS, siteUrl } from "@/lib/content";

export const metadata: Metadata = {
  title: "Online Matematik Kampları | Online Dershanem",
  description:
    "Maksimum 12 kişilik online matematik konu kamplarıyla öğrencinizin problem, fonksiyon, türev, integral ve temel matematik eksiklerini kısa sürede toparlamasına destek olun.",
  alternates: { canonical: "/kamplar/" },
  openGraph: {
    title: "Online Matematik Kampları | Online Dershanem",
    description:
      "Belirli bir matematik konusunda eksiği olan öğrenciler için maksimum 12 kişilik online, konu odaklı canlı kamplar.",
    url: `${siteUrl}/kamplar/`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Matematik Kampları | Online Dershanem",
    description:
      "Maksimum 12 kişilik online matematik konu kamplarıyla takılınan konuyu kısa sürede toparlayın.",
  },
};

const whatsappDigits = contact.whatsapp.replace(/[^\d]/g, "");

// Kamp CTA'ları fiyat netleşene kadar bilgi alma / ön kayıt akışına gider.
// PayTR ve sepete BAĞLANMAZ.
function campWhatsappHref(campName: string): string {
  const message = `Merhaba, "${campName}" hakkında bilgi almak istiyorum.`;
  return `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(message)}`;
}

const heroTrust = [
  `Maksimum ${CAMP_MAX_STUDENTS} öğrenci`,
  "Online canlı ders",
  "Konu odaklı yoğun program",
  "Ön kayıt sonrası ekip iletişime geçer",
];

const suitableFor = [
  "Belirli bir matematik konusunda takılan öğrenciler",
  "Sınav öncesi konu toparlamak isteyenler",
  "Düzenli derse başlamadan önce eksik kapatmak isteyenler",
  "Küçük grupta soru sorarak ilerlemek isteyenler",
  "TYT, AYT veya LGS matematiğinde konu eksiği olanlar",
];

const processSteps = [
  "Öğrenciye uygun kampı seçersiniz.",
  "Bilgilerinizi bırakır veya kamp için ön kayıt olursunuz.",
  "Ekibimiz seviye ve uygunluk için sizinle iletişime geçer.",
  "Online canlı kamp dersleri başlar.",
  "Her ders sonrası öğrenciye ne çalışacağı söylenir.",
];

const smallGroupReasons = [
  "Öğrenci rahatça soru sorabilir.",
  "Öğretmen grubun hızını yakından takip eder.",
  "Konu dağılmadan, hedefe odaklı ilerler.",
  "Kamp kısa sürede daha verimli olur.",
];

const campFaq = [
  {
    category: "Kamplar hakkında sık sorulanlar",
    items: [
      {
        q: "Kamplar online mı?",
        a: "Evet. Tüm kamp dersleri online ve canlı yapılır; öğrenci kendi evinden, gerçek zamanlı olarak derse katılır ve soru sorabilir.",
      },
      {
        q: "Bir kampta kaç öğrenci oluyor?",
        a: `Her kamp grubu en fazla ${CAMP_MAX_STUDENTS} öğrenciyle sınırlıdır. Amaç kalabalık anlatım değil, öğrencinin konuyu gerçekten toparlamasıdır.`,
      },
      {
        q: "Kamp hangi seviyeye uygun?",
        a: "Her kampın hedef seviyesi kartında belirtilir (LGS, TYT, AYT, temel/orta gibi). Hangi kampın öğrenciye uygun olduğundan emin değilseniz bizimle iletişime geçin, birlikte değerlendirelim.",
      },
      {
        q: "Dersler kayıt altına alınıyor mu?",
        a: "Kamplar canlı ders olarak planlanır; öncelik öğrencinin derste aktif olması ve soru sormasıdır. Kayıt ve telafi detaylarını ön görüşmede netleştiririz.",
      },
      {
        q: "Kamp sonrası ödev veriliyor mu?",
        a: "Evet. Her dersin sonunda öğrenciye ne çalışacağı söylenir; konu pekişsin diye yönlendirilmiş çalışma verilir.",
      },
      {
        q: "Öğrenci kamp sırasında soru sorabiliyor mu?",
        a: "Kesinlikle. Grup küçük olduğu için soru sormak dersin doğal bir parçasıdır; öğretmen her öğrenciyi takip eder.",
      },
      {
        q: "Kamp satın almak için hesap oluşturmam gerekir mi?",
        a: "Hayır. Kampa katılmak için hesap oluşturmanıza gerek yok. Bilgilerinizi bırakırsınız, gerisini ekibimiz halleder.",
      },
      {
        q: "Ödeme sonrası ne olacak?",
        a: "Şu an kamplar için ön kayıt/bilgi alma yoluyla ilerliyoruz. Ön kaydınızı aldıktan sonra ekibimiz seviye, program ve kontenjan için sizinle iletişime geçer.",
      },
      {
        q: "Uygun kampı bilmiyorsam ne yapmalıyım?",
        a: "Bize öğrencinin sınıfını ve zorlandığı konuyu yazmanız yeterli. Hangi kampın doğru olduğunu birlikte belirleriz; gerekirse Matematik Ders Paketi'ni de öneririz.",
      },
    ],
  },
];

export default function CampsPage() {
  const courseSchemas = mathCamps.map((camp) =>
    courseJsonLd({
      name: `${camp.name} — Online Matematik Kampı`,
      description: `${camp.goal} ${camp.durationLabel}, ${camp.lessonsLabel}, en fazla ${CAMP_MAX_STUDENTS} öğrencilik online canlı grup.`,
      url: `${siteUrl}/kamplar/`,
    }),
  );

  return (
    <>
      <SchemaJsonLd
        schema={[
          breadcrumbJsonLd([
            { name: "Ana Sayfa", url: "/" },
            { name: "Matematik Kampları", url: "/kamplar/" },
          ]),
          ...courseSchemas,
        ]}
      />
      <Navbar />
      <main className="od-public bg-[var(--od-cream)] text-[var(--od-ink)]">
        {/* 1 — Hero */}
        <section className="relative overflow-hidden border-b border-[var(--od-line)] bg-[linear-gradient(180deg,#FFFFFE_0%,#F5F3EC_100%)]">
          <div className="mx-auto max-w-5xl px-5 pb-16 pt-20 sm:pb-24 sm:pt-28">
            <span className="text-[13px] font-extrabold uppercase tracking-[0.16em] text-[var(--od-olive)]">
              Online Matematik Kampları
            </span>
            <h1 className="mt-5 max-w-3xl text-[38px] font-black leading-[1.05] tracking-tight text-[var(--od-ink)] sm:text-[58px] lg:text-[64px]">
              Matematikte takıldığı konuyu kısa sürede toparlasın.
            </h1>
            <p className="mt-6 max-w-2xl text-[17px] leading-8 text-[var(--od-ink-soft)] sm:text-[19px]">
              Online matematik kampları; belirli bir konuda eksiği olan
              öğrenciler için maksimum {CAMP_MAX_STUDENTS} kişilik canlı
              gruplarla yapılır. Kısa, yoğun ve hedef odaklı ilerler.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#kamplar"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--od-olive)] px-7 py-3 text-[15px] font-bold text-white transition hover:bg-[#2E3B24]"
              >
                Kampları İncele
                <ArrowRight size={17} />
              </Link>
              <Link
                href="/iletisim/"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--od-ink)]/15 bg-white/90 px-7 py-3 text-[15px] font-semibold text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/40"
              >
                Uygun Kampı Sor
              </Link>
            </div>
            <div className="mt-12 grid gap-x-8 gap-y-5 border-t border-[var(--od-line)] pt-8 sm:grid-cols-2 lg:grid-cols-4">
              {heroTrust.map((point) => (
                <div key={point}>
                  <span className="text-[14px] font-semibold leading-6 text-[var(--od-ink)]">
                    {point}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2 — Kime uygun? */}
        <section className="border-b border-[var(--od-line)] bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:py-24 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="text-[32px] font-black leading-[1.06] tracking-normal sm:text-[48px]">
                Bu kamplar kimler için?
              </h2>
              <p className="mt-5 text-[17px] leading-8 text-[var(--od-ink-soft)]">
                Kamplar, düzenli matematik dersinin yerine geçmez; belirli bir
                konuyu kısa sürede toparlamak isteyen öğrenciler için tasarlanır.
              </p>
            </div>
            <ul className="space-y-3">
              {suitableFor.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 border-t border-[var(--od-line)] pt-4"
                >
                  <Check
                    size={18}
                    strokeWidth={2.2}
                    className="mt-0.5 shrink-0 text-[var(--od-olive)]"
                    aria-hidden="true"
                  />
                  <span className="text-[16px] font-semibold leading-7 text-[var(--od-ink)]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 3 — Kamp kataloğu */}
        <section id="kamplar" className="scroll-mt-20 border-b border-[var(--od-line)] bg-[var(--od-cream)]">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
            <div className="max-w-3xl">
              <h2 className="text-[32px] font-black leading-[1.05] tracking-normal sm:text-[52px]">
                Matematik konu kampları.
              </h2>
              <p className="mt-5 text-[17px] leading-8 text-[var(--od-ink-soft)]">
                Her kamp tek bir konuyu hedefler: kısa, yoğun ve online canlı.
                Tüm gruplar maksimum {CAMP_MAX_STUDENTS} öğrenciyle sınırlıdır.
                Fiyat ve program bilgisi için iletişime geçmeniz yeterli.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {mathCamps.map((camp) => (
                <article
                  key={camp.id}
                  className="flex flex-col rounded-[22px] border border-[var(--od-line)] bg-white p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-[var(--od-olive)]/10 px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.1em] text-[var(--od-olive)]">
                      {camp.levelTag}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--od-ink-soft)]">
                      <Users size={14} aria-hidden="true" />
                      Maks. {CAMP_MAX_STUDENTS}
                    </span>
                  </div>

                  <h3 className="mt-4 text-[22px] font-black leading-tight text-[var(--od-ink)]">
                    {camp.name}
                  </h3>
                  <p className="mt-2.5 flex items-start gap-2 text-[14.5px] leading-7 text-[var(--od-ink-soft)]">
                    <Target size={16} className="mt-1 shrink-0 text-[var(--od-olive)]" aria-hidden="true" />
                    <span>{camp.goal}</span>
                  </p>

                  <dl className="mt-5 grid gap-2.5 border-t border-[var(--od-line)] pt-5 text-[13.5px]">
                    <div className="flex items-center gap-2 text-[var(--od-ink)]">
                      <CalendarDays size={15} className="shrink-0 text-[var(--od-olive)]" aria-hidden="true" />
                      <dt className="sr-only">Süre</dt>
                      <dd>
                        <span className="font-semibold">{camp.durationLabel}</span>
                        <span className="text-[var(--od-ink-soft)]"> · {camp.lessonsLabel}</span>
                      </dd>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--od-ink)]">
                      <Video size={15} className="shrink-0 text-[var(--od-olive)]" aria-hidden="true" />
                      <dt className="sr-only">Format</dt>
                      <dd>Online canlı grup</dd>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--od-ink)]">
                      <Users size={15} className="shrink-0 text-[var(--od-olive)]" aria-hidden="true" />
                      <dt className="sr-only">Seviye</dt>
                      <dd className="text-[var(--od-ink-soft)]">{camp.levelLabel}</dd>
                    </div>
                  </dl>

                  <div className="mt-6 flex flex-col gap-2 border-t border-[var(--od-line)] pt-5">
                    <Link
                      href="/iletisim/"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--od-olive)] px-5 py-2.5 text-[14px] font-bold text-white transition hover:bg-[#2E3B24]"
                    >
                      Ön Kayıt / Bilgi Al
                    </Link>
                    <a
                      href={campWhatsappHref(camp.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--od-ink)]/15 bg-white px-5 py-2.5 text-[14px] font-semibold text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/40"
                    >
                      <MessageCircle size={15} aria-hidden="true" />
                      WhatsApp&apos;tan Sor
                    </a>
                  </div>
                </article>
              ))}
            </div>

            <p className="mt-8 max-w-2xl text-[13.5px] leading-6 text-[var(--od-ink-soft)]">
              Kamp fiyatları ve takvimi öğrencinin seviyesine göre netleşir. Bu
              yüzden kontenjan ve program bilgisini ön görüşmede paylaşıyoruz.
            </p>
          </div>
        </section>

        {/* 4 — Kamp süreci */}
        <section className="border-b border-[var(--od-line)] bg-white">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
            <div className="max-w-3xl">
              <h2 className="text-[32px] font-black leading-[1.05] tracking-normal sm:text-[52px]">
                Kamp süreci nasıl ilerler?
              </h2>
              <p className="mt-5 text-[17px] leading-8 text-[var(--od-ink-soft)]">
                Satın almak için hesap oluşturmanıza gerek yok. Bilgilerinizi
                bırakın; gerisini birlikte planlayalım.
              </p>
            </div>
            <div className="mt-10 grid gap-3">
              {processSteps.map((step, index) => (
                <div
                  key={step}
                  className="grid grid-cols-[52px_1fr] items-center rounded-[18px] border border-[var(--od-line)] bg-[var(--od-cream)] p-4"
                >
                  <span className="text-[18px] font-black text-[var(--od-olive)]">
                    0{index + 1}
                  </span>
                  <span className="text-[16px] font-bold leading-7 text-[var(--od-ink)]">
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5 — Neden maksimum 12 kişi? */}
        <section className="border-b border-[var(--od-line)] bg-[var(--od-cream)]">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <h2 className="text-[32px] font-black leading-[1.05] tracking-normal sm:text-[52px]">
                {CAMP_MAX_STUDENTS} kişiden fazlasını almıyoruz.
              </h2>
              <p className="mt-5 text-[17px] leading-8 text-[var(--od-ink-soft)]">
                Kamp derslerinde amaç kalabalık anlatım yapmak değil, öğrencinin
                konuyu gerçekten toparlamasını sağlamaktır. Bu yüzden gruplar
                maksimum {CAMP_MAX_STUDENTS} öğrenciyle sınırlıdır.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {smallGroupReasons.map((item) => (
                <li
                  key={item}
                  className="rounded-[18px] border border-[var(--od-line)] bg-white p-5 text-[15px] font-semibold leading-7 text-[var(--od-ink)]"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 6 — Matematik Ders Paketi ile ilişki */}
        <section className="border-b border-[var(--od-line)] bg-white">
          <div className="mx-auto max-w-4xl px-5 py-16 text-center sm:py-24">
            <h2 className="mx-auto max-w-3xl text-[28px] font-black leading-[1.1] tracking-normal text-[var(--od-ink)] sm:text-[42px]">
              Kamp, düzenli matematik dersinin yerine geçmez; eksiği kapatmak
              için güçlü bir başlangıçtır.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-8 text-[var(--od-ink-soft)]">
              Kamp belirli bir konuyu toparlamak için idealdir. Öğrencinin daha
              düzenli takip edilmesi gerekiyorsa Matematik Ders Paketi ile devam
              edebilirsiniz.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/matematik-ders-paketi/"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--od-olive)] px-7 py-3 text-[15px] font-bold text-white transition hover:bg-[#2E3B24]"
              >
                Matematik Ders Paketini İncele
                <ArrowRight size={17} />
              </Link>
              <Link
                href="/iletisim/"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--od-ink)]/15 bg-white px-7 py-3 text-[15px] font-semibold text-[var(--od-ink)] transition hover:border-[var(--od-ink)]/40"
              >
                Bizimle Görüşün
              </Link>
            </div>
          </div>
        </section>

        {/* 7 — SSS */}
        <section className="bg-[var(--od-cream)] pt-16 sm:pt-24">
          <div className="mx-auto max-w-3xl px-5 text-center">
            <h2 className="font-display text-[30px] font-normal leading-[1.15] tracking-tight text-[var(--od-ink)] sm:text-[40px]">
              Kamplar hakkında merak edilenler.
            </h2>
          </div>
          <div className="mt-12">
            <FaqAccordion categories={campFaq} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
