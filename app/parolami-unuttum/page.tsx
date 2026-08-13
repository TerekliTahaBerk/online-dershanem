import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ForgotPasswordForm } from "@/components/panel/forgot-password-form";

export const metadata: Metadata = { title: "Parolamı Unuttum", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return <div className="site-scope"><SiteHeader /><main id="main-content" tabIndex={-1}><section className="site-container flex justify-center py-16 sm:py-24"><div className="w-full max-w-[440px]"><span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]"><KeyRound size={19} aria-hidden="true" /></span><h1 className="mt-5 font-display text-[clamp(2rem,4vw,2.6rem)] leading-[1.1] text-[var(--site-ink)]">Parolanızı yenileyin.</h1><p className="mt-3 text-[15px] leading-7 text-[var(--site-body)]">Hesabınızda kullandığınız e-postayı yazın. Kayıtlıysa size güvenli bir yenileme bağlantısı göndereceğiz.</p><div className="mt-8 rounded-[24px] border border-[var(--site-line)] bg-white p-6 sm:p-8"><ForgotPasswordForm /></div></div></section></main><SiteFooter /></div>;
}
