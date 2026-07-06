import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/site/login-form";

export const metadata: Metadata = {
  title: "Giriş yap",
  description: "Online Dershanem öğrenci girişi.",
  alternates: { canonical: "/giris" },
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="site-scope flex min-h-screen flex-col bg-[var(--site-bg-warm)]">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[var(--site-body)] transition-colors hover:text-[var(--site-ink)]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Ana sayfa
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-[440px]">
          <div className="rounded-[28px] border border-[var(--site-line)] bg-white p-7 shadow-[0_30px_70px_-40px_rgba(20,20,15,0.3)] sm:p-10">
            <div className="flex flex-col items-center text-center">
              <Link href="/" aria-label="Online Dershanem ana sayfa">
                <Image
                  src="/onlinedershanem_.png"
                  alt="Online Dershanem"
                  width={1050}
                  height={200}
                  sizes="180px"
                  className="h-8 w-auto"
                  priority
                />
              </Link>
              <h1 className="mt-7 font-display text-[32px] tracking-[-0.02em] text-[var(--site-ink)]">
                Giriş yap
              </h1>
              <p className="mt-2 text-[14.5px] text-[var(--site-body)]">Hesabına giriş yap.</p>
            </div>

            <LoginForm />
          </div>

          <p className="mt-6 text-center text-[14px] text-[var(--site-body)]">
            Henüz hesabın yok mu?{" "}
            <Link href="/paketler/" className="font-semibold text-[var(--brand-orange-ink)] hover:underline">
              Paketleri incele
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
