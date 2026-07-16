import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Headphones, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PageHero } from "@/components/site/page-hero";
import { StudentSupportChannels } from "@/components/site/student-support-channels";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...buildMarketingMetadata({
    title: "Öğrenci Girişi",
    description: "Öğrenci panelimiz yenileniyor. Bu sürede ders bağlantısı, program, paket ve ödeme desteği için ekibimize ulaşın.",
    canonical: "/giris",
  }),
  robots: { index: false, follow: false },
};

const supportBenefits = [
  { Icon: Headphones, label: "Ders ve program desteği" },
  { Icon: ShieldCheck, label: "Güvenli iletişim kanalları" },
  { Icon: CheckCircle2, label: "Paket ve ödeme kaydı desteği" },
];

/**
 * Öğrenci paneli girişi. Panel sıfırdan yazıldığı için burada ÇALIŞAN bir
 * giriş formu yok — kullanıcıdan parola/kod istemek yerine durumu açıkça
 * söyleyip çalışan destek kanallarına yönlendiriyoruz.
 */
export default function LoginPage() {
  return (
    <div className="site-scope">
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <PageHero
          eyebrow="Öğrenci paneli"
          align="left"
          title={<>Panelimiz sizin için <span className="site-hl">yenileniyor.</span></>}
          subtitle="Öğrenci panelini baştan hazırlıyoruz. Bu sürede ders bağlantınız, grup programınız ve ödeme kaydınız için ekibimiz yanınızda — sizden parola veya tek kullanımlık kod istemiyoruz."
        />
        <section className="site-container py-14 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
            <div>
              <p className="site-kicker">Panel yenilenirken</p>
              <h2 className="mt-4 max-w-lg font-display text-[clamp(2rem,4vw,3rem)] leading-tight text-[var(--site-ink)]">Panel yokken de yalnız değilsiniz.</h2>
              <p className="mt-4 max-w-lg text-[15px] leading-7 text-[var(--site-body)]">Panelin yaptığı her işi bu sürede ekibimiz üstleniyor. Yalnızca çalışan iletişim kanallarını kullanıyoruz; kart bilgisi, şifre veya tek kullanımlık kod istemeyiz.</p>
              <ul className="mt-7 space-y-3">
                {supportBenefits.map(({ Icon, label }) => (
                  <li key={label} className="flex items-center gap-3 text-[14.5px] font-medium text-[var(--site-body)]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]"><Icon size={16} aria-hidden="true" /></span>
                    {label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[26px] border border-[var(--site-line)] bg-white p-6 sm:p-8">
              <h2 className="font-display text-[25px] text-[var(--site-ink)]">Nasıl yardımcı olabiliriz?</h2>
              <p className="mt-2 text-[14px] leading-6 text-[var(--site-body)]">Konunuzu seçmeniz gerekmez; WhatsApp üzerinden kısa bir mesaj bırakmanız yeterli.</p>
              <StudentSupportChannels />
            </div>
          </div>
          <div className="mt-10 border-t border-[var(--site-line)] pt-8 text-center text-[15px] text-[var(--site-body)]">
            Henüz öğrencimiz değil misiniz?{" "}
            <Link href="/ders-paketleri/" className="font-semibold text-[var(--brand-olive)] hover:underline">Matematik paketlerini inceleyin</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
