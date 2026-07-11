import Link from "next/link";
import {
  ArrowRight,
  Check,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { hero } from "@/lib/site-content";
import { HeroLessonMockup } from "@/components/marketing/mockups";

const benefits = [
  "En fazla 4 öğrenci",
  "Seviyeye göre grup",
  "Ders sonrası net çalışma planı",
];

export function Hero() {
  return (
    <section className="bg-white pb-4 pt-3 sm:pb-6 sm:pt-5">
      <div className="site-container">
        <div className="relative overflow-hidden rounded-[30px] bg-[#26341f] px-5 py-8 text-white sm:rounded-[40px] sm:px-10 sm:py-10 lg:px-14 lg:py-11">
          <div className="pointer-events-none absolute -right-24 -top-32 h-[420px] w-[420px] rounded-full bg-[#5f7547]/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-52 left-[22%] h-[420px] w-[420px] rounded-full bg-[#f4d86a]/10 blur-3xl" />

          <div className="relative grid items-center gap-10 lg:grid-cols-[.92fr_1.08fr] lg:gap-12 xl:gap-16">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[12px] font-semibold text-[#f6f4e8] backdrop-blur sm:text-[13px]">
                <Sparkles size={14} className="text-[#f4d86a]" aria-hidden="true" />
                {hero.pill}
              </div>

              <h1 className="mt-5 font-display text-[clamp(3rem,4.9vw,5.2rem)] leading-[.91] tracking-[-.03em] text-white">
                Matematikte kaybolma. <span className="text-[#f4d86a]">Yolun net olsun.</span>
              </h1>
              <p className="mt-5 max-w-xl text-[16px] leading-7 text-white/75 sm:text-[17px] sm:leading-7">
                LGS ve YKS öğrencileri için canlı matematik dersi, küçük grup ilgisi ve her ders sonrasında ne çalışacağını gösteren düzenli takip.
              </p>

              <ul className="mt-5 grid gap-2.5 text-[14px] text-white/90 sm:grid-cols-2 sm:text-[15px] lg:grid-cols-1 xl:grid-cols-2">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f4d86a] text-[#26341f]">
                      <Check size={12} strokeWidth={3} aria-hidden="true" />
                    </span>
                    {benefit}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href={hero.primary.href} className="site-btn site-btn-hero site-btn-lg w-full sm:w-auto">
                  LGS / YKS Paketlerini Gör
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
                <Link href={hero.secondary.href} className="site-btn site-btn-hero-ghost site-btn-lg w-full sm:w-auto">
                  <MessageCircle size={17} aria-hidden="true" />
                  Ücretsiz Ön Görüşme
                </Link>
              </div>

              <p className="mt-4 flex items-center gap-2 text-[12.5px] text-white/60">
                <ShieldCheck size={15} className="text-[#f4d86a]" aria-hidden="true" />
                Aylık paket · Taahhüt yok · PayTR ile güvenli ödeme
              </p>
            </div>

            <div className="relative lg:pl-2">
              <div className="rounded-[28px] border border-white/15 bg-white/10 p-2.5 shadow-[0_32px_90px_-30px_rgba(0,0,0,.65)] backdrop-blur sm:p-4">
                <HeroLessonMockup />
              </div>
              <div className="absolute -bottom-5 left-5 hidden items-center gap-3 rounded-2xl border border-[#e8e3d6] bg-white px-4 py-3 text-[#14140f] shadow-xl sm:flex lg:-left-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e3ead3] text-[#3a4a2c]">
                  <Video size={19} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-[12px] font-bold">Canlı ve etkileşimli</span>
                  <span className="mt-0.5 block text-[11px] text-[#77776e]">Öğrenci çözümünü gösterir</span>
                </span>
              </div>
              <div className="absolute -right-4 -top-5 hidden items-center gap-3 rounded-2xl border border-white/15 bg-[#f4d86a] px-4 py-3 text-[#26341f] shadow-xl xl:flex">
                <Users size={20} aria-hidden="true" />
                <span className="text-[12px] font-extrabold">Maksimum 4 öğrenci</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
