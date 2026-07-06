import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/site/login-form";

export const metadata: Metadata = {
  title: "Giriş yap",
  description: "Online Dershanem öğrenci girişi.",
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
                  className="h-10 w-auto sm:h-12"
                  priority
                />
              </Link>
              <h1 className="mt-14 font-display text-[clamp(2.6rem,7vw,4rem)] tracking-[-0.035em] text-[var(--site-ink)]">
                Giriş yap
              </h1>
              <p className="mt-7 text-[18px] text-[var(--site-body)] sm:text-[22px]">Lütfen hesabına giriş yap.</p>
            </div>

            <LoginForm />
          </div>

          <p className="mt-10 text-center text-[15px] text-[var(--site-body)] sm:text-[17px]">
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
