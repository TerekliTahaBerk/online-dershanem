import Link from "next/link";
import { ArrowRight, Users, CalendarCheck, ShieldCheck } from "lucide-react";
import { NetGrowthMockup } from "@/components/marketing/mockups";

const stats = [
  { icon: Users, big: "En fazla 4", label: "Öğrencilik grup — herkes görünür, herkes soru sorar." },
  { icon: CalendarCheck, big: "Her hafta", label: "Veliye anlaşılır gelişim notu ve öğrenci için plan." },
  { icon: ShieldCheck, big: "Taahhütsüz", label: "Aylık ilerler, istediğin zaman bırakabilirsin." },
];

/**
 * Sonuçlar / yaklaşım bölümü. Abartılı/kanıtlanmamış başarı oranı iddiası
 * içermez; grafikler "temsilî" olarak işaretlidir, stat kartları gerçek
 * ürün gerçeklerine dayanır.
 */
export function ResultsSection() {
  return (
    <section className="bg-white">
      <div className="site-container py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="site-eyebrow justify-center">Ölçülebilir gelişim</p>
          <h2 className="mt-4 font-display text-[clamp(2rem,4.6vw,3.25rem)] leading-[1.08] tracking-[-0.02em] text-[var(--site-ink)]">
            Sonuçlar <span className="site-hl">konuşuyor.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[15.5px] leading-7 text-[var(--site-body)]">
            Düzenli takip, birebir ilgi ve kişiye özel plan ile öğrenciler gelişimini somut olarak
            görür. Aşağıdaki gelişim görünümü temsilîdir.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[28px] border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-6 sm:p-8">
            <NetGrowthMockup />
          </div>

          <div className="flex flex-col justify-center rounded-[28px] border border-[var(--site-line)] bg-white p-8 sm:p-10">
            <h3 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-[1.12] tracking-[-0.02em] text-[var(--site-ink)]">
              Öğrenci gelişimini tahmin etmek yerine görürsün.
            </h3>
            <p className="mt-5 text-[15px] leading-7 text-[var(--site-body)]">
              Her ders sonunda plan, ödev ve öğretmen notu; her hafta veliye kısa bir gelişim özeti.
              Süreç görünür olduğunda ilerleme de sürdürülebilir hale gelir.
            </p>
            <Link
              href="/#basari-hikayeleri"
              className="mt-6 inline-flex w-fit items-center gap-2 text-[15px] font-semibold text-[var(--brand-orange-ink)] hover:underline"
            >
              Başarı hikayelerini gör
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          {stats.map(({ icon: Icon, big, label }) => (
            <div key={big} className="rounded-[24px] border border-[var(--site-line)] bg-white p-7">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-orange-soft)] text-[var(--brand-orange-ink)]">
                <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <div className="mt-5 font-display text-[28px] tracking-[-0.02em] text-[var(--site-ink)]">{big}</div>
              <p className="mt-2 text-[14px] leading-6 text-[var(--site-body)]">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
