import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ResetPasswordForm } from "@/components/panel/reset-password-form";

export const metadata: Metadata = { title: "Yeni Parola Belirle", robots: { index: false, follow: false } };

export default function ResetPasswordPage() {
  return <div className="site-scope"><SiteHeader /><main id="main-content" tabIndex={-1}><section className="site-container flex justify-center py-16 sm:py-24"><div className="w-full max-w-[440px]"><span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]"><ShieldCheck size={19} aria-hidden="true" /></span><h1 className="mt-5 font-display text-[clamp(2rem,4vw,2.6rem)] leading-[1.1] text-[var(--site-ink)]">Yeni parolanızı belirleyin.</h1><p className="mt-3 text-[15px] leading-7 text-[var(--site-body)]">Başarılı yenilemeden sonra güvenliğiniz için tüm açık oturumlarınız kapatılır.</p><div className="mt-8 rounded-[24px] border border-[var(--site-line)] bg-white p-6 sm:p-8"><ResetPasswordForm /></div></div></section></main><SiteFooter /></div>;
}
