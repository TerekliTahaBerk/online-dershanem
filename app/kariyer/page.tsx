import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Footer } from "@/components/sections/footer";
import { contact, siteUrl } from "@/lib/content";

export const metadata: Metadata = {
  title: "Kariyer | Online Dershanem",
  description:
    "Online Dershanem'de açık pozisyonlar. Eğitimin geleceğini birlikte inşa edecek hocalar, içerik ekibi ve kampüs elçileriyle tanışmak istiyoruz.",
  alternates: { canonical: "/kariyer/" },
  openGraph: {
    title: "Kariyer | Online Dershanem",
    description:
      "Eğitimin geleceğini birlikte kurmak için Online Dershanem ekibine katıl.",
    url: `${siteUrl}/kariyer/`
  }
};

type Role = {
  title: string;
  location: string;
  type: string;
  summary: string;
};

const openRoles: Role[] = [
  {
    title: "Öğrenci Elçisi (Student Ambassador)",
    location: "Yerinde · Üniversite kampüsleri",
    type: "Yarı zamanlı",
    summary:
      "Üniversitende Online Dershanem'i temsil edecek; etkinlikler, birebir görüşmeler ve sosyal medya çalışmalarıyla topluluğu büyütecek öğrenci elçileri arıyoruz."
  }
];

export default function CareersPage() {
  const mailtoSubject = encodeURIComponent("Kariyer Başvurusu");
  const mailtoBody = encodeURIComponent(
    "Merhaba,\n\nİlgilendiğim pozisyon: \n\nKısaca kendimden bahsetmem gerekirse...\n"
  );

  return (
    <>
      <Navbar />
      <main className="bg-[var(--od-cream)] text-[var(--od-ink)]">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-3xl px-5 pt-24 pb-14 sm:pt-32 sm:pb-20 text-center">
            {/* Cube doodle */}
            <CubeDoodle className="mx-auto h-24 w-24 sm:h-28 sm:w-28" />

            <h1 className="mt-6 font-display text-[40px] font-normal leading-[1.05] tracking-tight text-[var(--od-ink)] sm:text-[60px]">
              Eğitimin geleceğini{" "}
              <em className="italic text-[var(--od-olive)]">birlikte</em> inşa
              edelim.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[15.5px] leading-7 text-[var(--od-ink-soft)]">
              Online Dershanem; öğrencinin yüzlerce kişi içinde
              kaybolmadığı, hocasının onu adıyla tanıdığı bir model kuruyor. Bu
              modeli büyütecek küçük ama etkili bir ekiple çalışıyoruz.
            </p>
          </div>
        </section>

        {/* Open Roles panel */}
        <section className="relative mx-auto max-w-6xl px-5 pb-20 sm:pb-28">
          {/* Soft ruled-paper backdrop */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 -z-10 h-[120%] bg-[var(--od-sky-soft)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[120%]"
            style={{
              backgroundImage:
                "linear-gradient(to bottom, transparent 0, transparent 39px, rgba(20,20,15,0.05) 40px)",
              backgroundSize: "100% 40px"
            }}
          />

          <div className="overflow-hidden rounded-[28px] border border-[#3F4FE0]/20 bg-white shadow-[0_28px_70px_-32px_rgba(40,55,180,0.28)] sm:mt-16">
            <div className="grid gap-0 lg:grid-cols-[0.95fr_2fr]">
              {/* Left blue intro */}
              <aside className="relative bg-[#3F4FE0] p-8 text-white sm:p-10">
                <h2 className="font-display text-[32px] font-normal leading-tight tracking-tight sm:text-[36px]">
                  Açık Pozisyonlar
                </h2>
                <p className="mt-4 max-w-xs text-[14px] leading-7 text-white/85">
                  Küçük ve odaklı bir ekipte, yaptığın işin doğrudan binlerce
                  öğrenciye dokunduğu bir yerde çalış.
                </p>
                <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.14em] text-white">
                  {openRoles.length} açık pozisyon
                </div>
              </aside>

              {/* Right roles list */}
              <div className="divide-y divide-[var(--od-line)]">
                {openRoles.map((role) => (
                  <a
                    key={role.title}
                    href={`mailto:${contact.email}?subject=${mailtoSubject}&body=${mailtoBody}`}
                    className="group flex items-start justify-between gap-6 px-6 py-6 transition hover:bg-[var(--od-cream-2)] sm:px-8 sm:py-7"
                  >
                    <div className="min-w-0">
                      <h3 className="font-display text-[20px] font-normal leading-tight tracking-tight text-[var(--od-ink)] sm:text-[22px]">
                        {role.title}
                      </h3>
                      <p className="mt-1.5 text-[12.5px] font-medium uppercase tracking-[0.14em] text-[#8B8B7E]">
                        <span>{role.location}</span>
                        <span className="mx-2 text-[#C8C8B5]">·</span>
                        <span>{role.type}</span>
                      </p>
                      <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[var(--od-ink-soft)]">
                        {role.summary}
                      </p>
                    </div>
                    <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--od-line)] bg-white text-[var(--od-ink)] transition group-hover:border-[#3F4FE0]/40 group-hover:bg-[#3F4FE0] group-hover:text-white">
                      <ArrowRight size={15} strokeWidth={1.8} />
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Aspirational mission card */}
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              {
                title: "Küçük ekip, büyük etki",
                body: "Kararlar hızlı alınır, yapılan iş doğrudan öğrencinin haftasına dokunur."
              },
              {
                title: "Premium standartlar",
                body: "Hocadan yazılım altyapısına kadar her detayda butik kalite arıyoruz."
              },
              {
                title: "Şeffaf süreç",
                body: "Hedefler ölçülebilir, geri bildirim düzenli, gelişim alanları nettir."
              }
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-[var(--od-line)] bg-white p-6 shadow-[0_18px_44px_-32px_rgba(20,20,15,0.16)]"
              >
                <h3 className="font-display text-[20px] font-normal leading-tight tracking-tight text-[var(--od-ink)]">
                  {item.title}
                </h3>
                <p className="mt-3 text-[14px] leading-6 text-[var(--od-ink-soft)]">
                  {item.body}
                </p>
              </article>
            ))}
          </div>

          {/* Footer CTA */}
          <div className="mt-12 overflow-hidden rounded-[28px] border border-[var(--od-line)] bg-[var(--od-yellow-soft)] p-8 sm:p-12">
            <div className="grid gap-6 sm:grid-cols-[1.4fr_auto] sm:items-center">
              <div>
                <span className="text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--od-olive)]">
                  Listede yoksun ama yine de katılmak istiyorsun
                </span>
                <h3 className="mt-3 font-display text-[28px] leading-tight tracking-tight text-[var(--od-ink)] sm:text-[36px]">
                  Spekülatif başvurunu da bekleriz.
                </h3>
                <p className="mt-3 max-w-md text-[14.5px] leading-7 text-[var(--od-ink-soft)]">
                  Online eğitime değer katacağına inanıyorsan, kısa bir mesaj
                  ve özgeçmişini bize gönder. Doğru zaman geldiğinde geri dönelim.
                </p>
              </div>
              <Link
                href={`mailto:${contact.email}?subject=${mailtoSubject}&body=${mailtoBody}`}
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--od-ink)] px-6 py-3 text-[14px] font-medium text-white transition hover:bg-black"
              >
                Bize yaz
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

/* ── Cube doodle (Opennote-inspired) ──────────────────────────── */
function CubeDoodle({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
    >
      {/* tiny stars */}
      <path
        d="M22 36 l1.5 -3.5 l1.5 3.5 l3.5 1.5 l-3.5 1.5 l-1.5 3.5 l-1.5 -3.5 l-3.5 -1.5z"
        fill="#3F4FE0"
        opacity="0.65"
      />
      <path
        d="M97 18 c2 1 3 2 3 3 c-1 0 -2 1 -3 3 c-1 -2 -2 -3 -3 -3 c1 -1 2 -2 3 -3z"
        fill="#3F4FE0"
        opacity="0.7"
      />

      {/* cube — top face */}
      <path
        d="M60 18 L92 32 L60 46 L28 32 Z"
        stroke="#1B1F4D"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="white"
      />
      {/* left face */}
      <path
        d="M28 32 L28 68 L60 82 L60 46 Z"
        stroke="#1B1F4D"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="white"
      />
      {/* right face */}
      <path
        d="M92 32 L92 68 L60 82 L60 46 Z"
        stroke="#1B1F4D"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="white"
      />
      {/* highlighted top tile */}
      <path d="M60 18 L76 25 L60 32 L44 25 Z" fill="#3F4FE0" opacity="0.85" />
      {/* internal grid lines: top */}
      <path d="M44 25 L44 38 M76 25 L76 38" stroke="#1B1F4D" strokeWidth="1.2" />
      <path d="M44 38 L60 32 M76 38 L60 32" stroke="#1B1F4D" strokeWidth="1.2" />
      {/* left grid */}
      <path d="M28 44 L60 58 M28 56 L60 70" stroke="#1B1F4D" strokeWidth="1.2" />
      <path d="M44 38 L44 75" stroke="#1B1F4D" strokeWidth="1.2" />
      {/* right grid */}
      <path d="M60 58 L92 44 M60 70 L92 56" stroke="#1B1F4D" strokeWidth="1.2" />
      <path d="M76 38 L76 75" stroke="#1B1F4D" strokeWidth="1.2" />

      {/* shadow */}
      <ellipse cx="60" cy="100" rx="34" ry="3" fill="#1B1F4D" opacity="0.08" />
    </svg>
  );
}
