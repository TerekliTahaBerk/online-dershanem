import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { siteUrl } from "@/lib/content";

export const metadata: Metadata = {
  title: "Misyonumuz | Online Dershanem",
  description:
    "Bir insanın geleceğinin maddi imkanlarla değil; merakı, emeği ve potansiyeliyle şekillendiği bir sistem inşa ediyoruz.",
  alternates: { canonical: "/misyonumuz/" },
  openGraph: {
    title: "Misyonumuz | Online Dershanem",
    description:
      "Kaliteli eğitimi bir hak olarak yeniden tanımlamak için kurulduk. Akademik dayanışma modeline dair manifestomuz.",
    url: `${siteUrl}/misyonumuz/`,
  },
};

export default function MissionPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[var(--od-cream)] text-[var(--od-ink)]">
        {/* Hero with hand-drawn header doodle */}
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-3xl px-5 pt-20 pb-12 text-center sm:pt-28">
            {/* Small inline doodle illustration */}
            <div className="mx-auto h-32 w-44 sm:h-40 sm:w-56" aria-hidden>
              <svg viewBox="0 0 220 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
                <g
                  stroke="#2A2A22"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                >
                  {/* Person 1 (left) */}
                  <circle cx="55" cy="48" r="14" />
                  <path d="M48 38c2-4 14-4 16 0" />
                  <path d="M55 62v8" />
                  <path d="M40 88c4-12 26-12 30 0v40h-30z" />
                  <path d="M40 98l-6 8 6 6" />
                  <path d="M70 98l6 8-6 6" />
                  {/* Cheek */}
                  <ellipse cx="49" cy="52" rx="2" ry="1.5" fill="#F2A5A5" stroke="none" />
                  <ellipse cx="61" cy="52" rx="2" ry="1.5" fill="#F2A5A5" stroke="none" />
                  {/* Eyes */}
                  <path d="M50 47l2 2 2-2" />
                  <path d="M58 47l2 2 2-2" />
                  <path d="M52 56q3 2 6 0" />

                  {/* Person 2 (center) */}
                  <circle cx="110" cy="46" r="14" />
                  <path d="M103 36c2-4 14-4 16 0" />
                  <path d="M110 60v8" />
                  <path d="M95 86c4-12 26-12 30 0v42h-30z" />
                  <ellipse cx="104" cy="50" rx="2" ry="1.5" fill="#F2A5A5" stroke="none" />
                  <ellipse cx="116" cy="50" rx="2" ry="1.5" fill="#F2A5A5" stroke="none" />
                  <path d="M105 45l2 2 2-2" />
                  <path d="M113 45l2 2 2-2" />
                  <path d="M107 54q3 2 6 0" />

                  {/* Person 3 (right) */}
                  <circle cx="165" cy="48" r="14" />
                  <path d="M158 38c2-4 14-4 16 0" />
                  <path d="M165 62v8" />
                  <path d="M150 88c4-12 26-12 30 0v40h-30z" />
                  <ellipse cx="159" cy="52" rx="2" ry="1.5" fill="#F2A5A5" stroke="none" />
                  <ellipse cx="171" cy="52" rx="2" ry="1.5" fill="#F2A5A5" stroke="none" />
                  <path d="M160 47l2 2 2-2" />
                  <path d="M168 47l2 2 2-2" />
                  <path d="M162 56q3 2 6 0" />

                  {/* Sparkle accents */}
                  <path d="M22 30l3 3M28 30l-3 3" />
                  <path d="M198 24c1.5 0 0 4 0 4M200 28c0-1.5 4 0 4 0" />
                  <circle cx="195" cy="36" r="1" fill="#2A2A22" stroke="none" />
                </g>
              </svg>
            </div>

            <span className="mt-4 inline-flex items-center rounded-full border border-[var(--od-line)] bg-white/70 px-3 py-1 text-[11.5px] font-medium uppercase tracking-[0.16em] text-[var(--od-olive)] backdrop-blur">
              Misyonumuz
            </span>

            <h1 className="mt-6 font-display text-[42px] font-normal leading-[1.04] tracking-tight text-[var(--od-ink)] sm:text-[60px]">
              Potansiyelin maddi koşullarla{" "}
              <em className="italic text-[var(--od-olive)]">sınırlanamayacağı</em>{" "}
              bir sistem.
            </h1>
          </div>
        </section>

        {/* Manifesto body */}
        <section className="mx-auto max-w-2xl px-5 pb-12">
          <div className="space-y-6 text-[15.5px] leading-[1.85] text-[var(--od-ink-soft)] sm:text-[16.5px]">
            <p>
              Biz bu platformu, potansiyelin hiçbir zaman maddi koşullarla
              sınırlanmaması gerektiğine inanarak kurduk.
            </p>

            <p>
              Bugün Türkiye’de en başarılı öğrencilerin büyük bir kısmı kaliteli
              eğitime ulaşmakta zorlanırken, ülkenin en yetenekli üniversite
              öğrencileri ise kendi potansiyellerini geliştirmek yerine geçinmek
              için farklı işlerde çalışmak zorunda kalıyor. Sorun yetenek
              eksikliği değil; sistemin onlara başka bir seçenek sunmaması.
            </p>

            <p>
              Aynı zamanda eğitim her geçen gün daha pahalı, daha parçalı ve
              daha erişilmez hale geliyor. İyi eğitim bir hak olmaktan çıkıp
              ayrıcalığa dönüşüyor.
            </p>

            <Pull>Biz bunun farklı olabileceğine inanıyoruz.</Pull>

            <p>
              <strong className="font-medium text-[var(--od-ink)]">
                Misyonumuz;
              </strong>{" "}
              bilgiyi, o yolu yakın zamanda başarıyla geçmiş öğrencilerle şimdi
              öğrenmeye çalışan öğrenciler arasında doğrudan buluşturan yeni bir
              öğrenme modeli kurmak.
            </p>

            <p>
              Daha erişilebilir, daha samimi ve daha sürdürülebilir bir eğitim
              sistemi inşa etmek.
            </p>

            <p>
              Çünkü bazen en iyi anlatan kişiler, aynı süreci en yakın zamanda
              yaşamış olanlardır. Sınav baskısını, kafa karışıklığını, öğrenme
              sürecini ve başarıya giden yolu gerçekten bilenler.
            </p>

            <p>
              Bu yüzden başarılı üniversite öğrencileriyle öğrenmek isteyen
              gençleri bir araya getiriyoruz.
            </p>

            <Pull>Çünkü bu yalnızca ders anlatmak değil.</Pull>

            <p>
              Bu; öğrencilerin kendi bilgileriyle değer üretebildiği, gençlerin
              ekonomik olarak güçlenebildiği ve kaliteli eğitimin daha
              ulaşılabilir hale geldiği yeni bir{" "}
              <em className="italic text-[var(--od-ink)]">
                akademik dayanışma modeli
              </em>
              .
            </p>

            <p>
              Biz teknolojinin insan öğrenmesinin yerine geçmesine değil, onu
              daha kişisel, daha verimli ve daha erişilebilir hale getirmesine
              inanıyoruz.
            </p>

            <p>Çünkü mesele yalnızca sınav kazanmak değil.</p>

            <p>
              <strong className="font-medium text-[var(--od-ink)]">
                Mesele; kaybolup gidecek potansiyelleri ortaya çıkarmak.
              </strong>
            </p>

            <p>
              Genç insanların öğrenirken aynı zamanda üretebildiği,
              öğretebildiği ve birlikte büyüyebildiği bir gelecek kurmak.
            </p>

            {/* Closing pull-quote in serif */}
            <div className="my-10 border-t border-[var(--od-line)] pt-10">
              <p className="text-[12.5px] font-medium uppercase tracking-[0.18em] text-[var(--od-olive)]">
                Ve en önemlisi
              </p>
              <p className="mt-5 font-display text-[26px] font-normal leading-[1.25] tracking-tight text-[var(--od-ink)] sm:text-[32px]">
                Bir insanın geleceğinin, sahip olduğu maddi imkanlarla değil;{" "}
                <em className="italic text-[var(--od-olive)]">merakı</em>,{" "}
                <em className="italic text-[var(--od-olive)]">emeği</em> ve{" "}
                <em className="italic text-[var(--od-olive)]">potansiyeliyle</em>{" "}
                şekillendiği bir sistem inşa etmek.
              </p>
            </div>

            {/* Signature */}
            <div className="flex flex-col items-center gap-3 pt-2 text-center">
              <Image
                src="/onlinedershanem_.png"
                alt="Online Dershanem"
                width={1050}
                height={200}
                className="h-5 w-auto object-contain opacity-70"
              />
              <p className="text-[14px] font-medium text-[var(--od-ink)]">
                — Taha Berk, Furkan &amp; Melih
              </p>
              <p className="text-[12.5px] text-[#8B8B7E]">Kurucular</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-3xl px-5 pb-24 pt-6">
          <div className="overflow-hidden rounded-[28px] border border-[var(--od-line)] bg-[var(--od-yellow-soft)] p-8 sm:p-12">
            <div className="grid gap-6 sm:grid-cols-[1.4fr_auto] sm:items-center">
              <div>
                <span className="text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--od-olive)]">
                  Bu hikâyenin parçası ol
                </span>
                <h3 className="mt-3 font-display text-[26px] leading-tight tracking-tight text-[var(--od-ink)] sm:text-[34px]">
                  Yolu yakın zamanda yürümüş bir hocayla tanış.
                </h3>
                <p className="mt-3 max-w-md text-[14.5px] leading-7 text-[var(--od-ink-soft)]">
                  10 dakikalık ücretsiz ön görüşmede sana doğru kombinasyonu
                  birlikte kuralım.
                </p>
              </div>
              <Link
                href="/seni-arayalim/"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--od-ink)] px-6 py-3 text-[14px] font-medium text-white transition hover:bg-black"
              >
                Seni arayalım
                <ArrowRight size={15} strokeWidth={1.8} />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Pull({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-display text-[22px] font-normal italic leading-[1.4] tracking-tight text-[var(--od-ink)] sm:text-[26px]">
      {children}
    </p>
  );
}
