import type { Metadata } from "next";
import { AppProviders } from "@/components/od/providers";

export const metadata: Metadata = {
  title: { default: "Panel · Online Dershanem", template: "%s · OD" },
  robots: { index: false, follow: false }
};

/**
 * /v2 — yeni panel sisteminin (Faz 0+) URL prefix'i. Faz 5 sonu route swap
 * yapıldığında bu prefix kaldırılır ve eski `app/admin`, `app/panel`, vb.
 * yerini bu yapıya bırakır.
 *
 * Bu layout sadece global provider'ları sarar (theme + query + tooltip + toaster).
 * AppShell her panel'in kendi layout'unda mount edilir (RBAC guard ile birlikte).
 */
export default function V2Layout({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
