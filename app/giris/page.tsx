import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/site/login-form";

export const metadata: Metadata = {
  title: "Öğrenci Desteği",
  description: "Mevcut Online Dershanem öğrencileri için ders, program ve ödeme desteği.",
  alternates: { canonical: "/giris" },
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="site-scope flex min-h-screen flex-col bg-white">
      <main className="flex flex-1 items-start justify-center px-5 py-16 sm:py-24">
        <div className="w-full max-w-[620px]">
          <div className="bg-white px-1 py-4 sm:px-10">
            <div className="flex flex-col items-center text-center">
              <Link href="/" aria-label="Online Dershanem ana sayfa">
                <Image
                  src="/onlinedershanem_.png"
                  alt="Online Dershanem"
                  width={1050}
                  height={200}
                  sizes="180px"
                  className="h-auto w-[180px] sm:w-[220px]"
                  priority
                />
              </Link>
              <h1 className="mt-14 font-display text-[clamp(2.6rem,7vw,4rem)] text-[var(--site-ink)]">
                Öğrenci desteği
              </h1>
              <p className="mt-5 max-w-lg text-[16px] leading-7 text-[var(--site-body)] sm:text-[18px]">
                Mevcut öğrenciler için ders bağlantısı, program ve ödeme konularında hızlıca yardımcı olalım.
              </p>
            </div>

            <LoginForm />
          </div>

          <p className="mt-8 text-center text-[15px] text-[var(--site-body)] sm:text-[17px]">
            Henüz başlamadın mı?{" "}
            <Link href="/ders-paketleri/" className="font-semibold text-[var(--brand-orange-ink)] hover:underline">
              Ders paketlerini incele
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
