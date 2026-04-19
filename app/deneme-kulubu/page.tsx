import type { Metadata } from "next";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { StickyContactBar } from "@/components/sections/sticky-contact-bar";
import { MultiStepLeadForm } from "@/components/sections/multi-step-lead-form";
import { Container } from "@/components/ui/container";
import { FadeIn } from "@/components/ui/fade-in";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";
import { siteUrl } from "@/lib/content";

export const metadata: Metadata = {
  title: "Online Deneme Kulübü — odk.",
  description:
    "TYT, AYT ve LGS öğrencileri için düzenli deneme çözümü, detaylı hata analizi ve net artış koçluğuyla sınav hazırlığını bir üst seviyeye taşı.",
  alternates: {
    canonical: "/deneme-kulubu/"
  },
  openGraph: {
    title: "Online Deneme Kulübü | odk.",
    description:
      "Sadece deneme değil; analiz, strateji ve koçlukla net artışını garantile. TYT, AYT ve LGS için.",
    url: `${siteUrl}/deneme-kulubu/`
  }
};

const packages = [
  {
    exam: "TYT",
    badge: "bg-ink text-white",
    border: "border-line",
    subjects: "Türkçe · Matematik · Fen · Sosyal",
    features: [
      "Haftalık TYT denemesi (gerçek sınav koşulları)",
      "Canlı analiz seansı — yanlışını öğretmenle çöz",
      "Kişisel hata haritası ve konu raporu",
      "Haftalık çalışma planı güncellemesi",
      "Grup: max 12 kişi",
    ],
  },
  {
    exam: "AYT",
    badge: "bg-pine text-white",
    border: "border-brand/30",
    subjects: "Sayısal · Eşit Ağırlık · Sözel",
    features: [
      "Haftalık AYT denemesi (branşına göre)",
      "Canlı analiz seansı — yanlışını öğretmenle çöz",
      "Kişisel hata haritası ve konu raporu",
      "Sayısal / EA / Sözel bazlı strateji",
      "Grup: max 12 kişi",
    ],
  },
  {
    exam: "LGS",
    badge: "bg-brand text-white",
    border: "border-line",
    subjects: "Matematik · Fen · Türkçe · Sosyal",
    features: [
      "Haftalık LGS denemesi",
      "Canlı analiz seansı — yanlışını öğretmenle çöz",
      "Yeni nesil soru stratejisi",
      "Kişisel hata haritası ve konu raporu",
      "Grup: max 12 kişi",
    ],
  },
];

export default function DenemeKulubuPage() {
  return (
    <>
      <Navbar />
      <main>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="border-b border-line bg-white">
          <Container>
            <FadeIn>
              <div className="py-16 sm:py-24">
                <Image
                  src="/odklogo2.jpeg"
                  alt="Online Deneme Kulübü"
                  width={320}
                  height={76}
                  className="h-9 w-auto object-contain"
                />
                <h1 className="mt-8 max-w-3xl text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">
                  Denemeyi çözdükten sonra<br className="hidden sm:block" />{" "}
                  <span className="text-brand">ne yapıyorsun?</span>
                </h1>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-muted">
                  Çoğu öğrenci denemeyi çözer, puanına bakar, devam eder. Hata nerede, neden tekrar ediyor — cevabı yoktur. biz tam olarak bunu çözüyoruz.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <LeadFunnelTrigger
                    source="odk_hero_cta"
                    eventName="landing_cta_click"
                    className="inline-flex rounded-full bg-anchor px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-pine"
                    analyticsId="odk_hero_cta"
                  >
                    Ön Kayıt Yap — Ücretsiz
                  </LeadFunnelTrigger>
                  <span className="text-sm text-muted/70">TYT · AYT · LGS · Yakında açılıyor</span>
                </div>
              </div>
            </FadeIn>
          </Container>
        </section>

        {/* ── Manifesto ────────────────────────────────────────────────── */}
        <section className="border-b border-line bg-paper">
          <Container>
            <div className="py-14 sm:py-20">
              <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
                <FadeIn>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Neden var olduk</p>
                </FadeIn>
                <FadeIn delay={0.05}>
                  <div className="space-y-5 text-base leading-relaxed text-muted sm:text-lg">
                    <p>
                      Türkiye'de deneme pazarı büyük. Herkes sana soru veriyor. Kitap, pdf, platform — binlerce soru, hiç analiz yok. Denemeyi bitiriyorsun, puana bakıyorsun, hayatına devam ediyorsun. Bir sonraki denemede aynı hataları yapıyorsun.
                    </p>
                    <p>
                      Sorun soru sayısı değil. Sorun, o yanlışın <strong className="text-ink">neden yanlış</strong> olduğunu bilmemek. Kavram mı eksik, dikkatsizlik mi, zaman mı bitti? Bu soruyu cevaplamadan soru çözmek sadece hataları pekiştirir.
                    </p>
                    <p className="font-medium text-ink">
                      odk. bunu değiştiriyor. Deneme araç. Asıl iş analiz.
                    </p>
                  </div>
                </FadeIn>
              </div>
            </div>
          </Container>
        </section>

        {/* ── Nasıl çalışır ────────────────────────────────────────────── */}
        <section className="border-b border-line bg-white">
          <Container>
            <div className="py-14 sm:py-20">
              <FadeIn>
                <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Her hafta aynı döngü</h2>
                <p className="mt-2 text-sm text-muted">Dört adım. Her tur biraz daha az hata.</p>
              </FadeIn>

              <div className="mt-10 space-y-0 divide-y divide-line">
                {[
                  {
                    n: "01",
                    title: "Denemeyi bağımsız çöz",
                    body: "Belirli günde, gerçek sınav koşullarında. Telefon yok, yardım yok. Süreyi kendin yönetirsin.",
                  },
                  {
                    n: "02",
                    title: "Canlı analiz seansına katıl",
                    body: "Denemenin hemen ardından öğretmenlerimizle buluşursun. Hangi soruyu neden yanlış yaptığını, hangi konuda açık verdiğini tek tek geçeriz. Max 12 kişilik grupta — kaybolmazsın.",
                  },
                  {
                    n: "03",
                    title: "Hata haritanı al",
                    body: "Kavram hatası mı, dikkatsizlik mi, zaman yönetimi mi? Hatanın türü belirlenmeden tedavi olmaz. Her denemeden sonra kişisel haritanı çıkarırız.",
                  },
                  {
                    n: "04",
                    title: "Planın güncellenir",
                    body: "Biriken veriye göre önümüzdeki haftanın odak noktaları netleşir. Sezgiyle değil, sayıyla.",
                  },
                ].map((step, i) => (
                  <FadeIn key={step.n} delay={i * 0.07}>
                    <div className="flex gap-8 py-8">
                      <span className="w-8 shrink-0 text-2xl font-black text-line sm:w-12 sm:text-4xl">{step.n}</span>
                      <div>
                        <h3 className="text-base font-semibold text-ink sm:text-lg">{step.title}</h3>
                        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">{step.body}</p>
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* ── Paketler ─────────────────────────────────────────────────── */}
        <section className="border-b border-line bg-paper">
          <Container>
            <div className="py-14 sm:py-20">
              <FadeIn>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Paketler</p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">TYT · AYT · LGS</h2>
                    <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
                      Paketler hazırlanıyor. Ön kayıt bırakırsan açılışta önce sen haberdar olursun — ve erken kayıt fiyatından yararlanırsın.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                    Yakında açılıyor
                  </span>
                </div>
              </FadeIn>

              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {packages.map((pkg, i) => (
                  <FadeIn key={pkg.exam} delay={i * 0.07}>
                    <article className={`flex h-full flex-col rounded-2xl border bg-white p-6 shadow-soft ${pkg.border}`}>
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${pkg.badge}`}>
                          {pkg.exam}
                        </span>
                      </div>
                      <p className="mt-3 text-xs font-medium text-muted/70">{pkg.subjects}</p>
                      <ul className="mt-4 flex-1 space-y-2.5">
                        {pkg.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm text-muted">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <LeadFunnelTrigger
                        source={`odk_package_${pkg.exam.toLowerCase()}_notify`}
                        eventName="landing_cta_click"
                        className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-line-strong px-5 py-2.5 text-xs font-semibold text-ink transition hover:bg-anchor hover:text-white hover:border-anchor"
                        analyticsId={`odk_package_${pkg.exam.toLowerCase()}_notify`}
                      >
                        Açılınca haber ver
                      </LeadFunnelTrigger>
                    </article>
                  </FadeIn>
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* ── Final CTA ────────────────────────────────────────────────── */}
        <section className="bg-anchor">
          <Container>
            <FadeIn delay={0.05}>
              <div className="py-16 sm:py-24">
                <Image
                  src="/odklogo1.png"
                  alt="odk."
                  width={80}
                  height={80}
                  className="h-14 w-14 rounded-xl bg-white object-contain p-1.5"
                />
                <h2 className="mt-6 max-w-xl text-2xl font-bold text-white sm:text-3xl">
                  İlk denemenden önce başla.
                </h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-mint/80">
                  Paketler henüz açılmadı ama liste dolmaya başladı. Ön kayıt bırakırsan fiyat avantajı ve öncelikli bildirim senindir.
                </p>
                <LeadFunnelTrigger
                  source="odk_final_cta"
                  eventName="landing_cta_click"
                  className="mt-8 inline-flex rounded-full bg-mint px-8 py-3.5 text-sm font-semibold text-pine transition hover:bg-white hover:text-anchor"
                  analyticsId="odk_final_cta"
                >
                  Ön Kayıt Yap — Ücretsiz
                </LeadFunnelTrigger>
              </div>
            </FadeIn>
          </Container>
        </section>

      </main>
      <MultiStepLeadForm />
      <Footer />
      <StickyContactBar />
    </>
  );
}
