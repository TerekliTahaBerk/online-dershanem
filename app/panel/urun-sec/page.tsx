import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpenCheck, Building2, ClipboardCheck } from "lucide-react";
import { requireActiveUser } from "@/lib/auth/guards";
import { getAccessibleProducts } from "@/lib/auth/products";
import { productRolePath } from "@/lib/auth/roles";
import { PanelShell } from "@/components/panel/panel-shell";

export const dynamic = "force-dynamic";

export default async function ProductSelectorPage() {
  const session = await requireActiveUser();
  const products = await getAccessibleProducts(session.userId, session.role);
  if (products.length === 1) redirect(productRolePath(products[0], session.role));

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email}>
      <div className="mx-auto max-w-6xl py-6 sm:py-12">
        <p className="text-xs font-extrabold uppercase tracking-[.1em] text-[var(--brand-olive)]">Çalışma alanı</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.05em] text-[var(--site-ink)] sm:text-4xl">Bugün hangi ürüne gideceksiniz?</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--site-body)]">Hesabınızın açık olduğu ürünü seçin. Panel içinden dilediğiniz zaman diğer ürüne geçebilirsiniz.</p>

        {products.length ? <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.includes("OD") ? <ProductCard href={productRolePath("OD", session.role)} title="Online Dershanem" description="Dersler, gruplar, ödevler, materyaller ve gelişim takibi." logo="/onlinedershanem_.png" icon={<BookOpenCheck size={18} />} wideLogo /> : null}
          {products.includes("ODK") ? <ProductCard href={productRolePath("ODK", session.role)} title="Online Deneme Kulübü" description="Planlı matematik denemeleri, canlı sınavlar ve kazanım analizi." logo="/odklogo1.png" icon={<ClipboardCheck size={18} />} /> : null}
          {session.role === "ADMIN" ? <ProductCard href="/panel/yonetim/isletme/genel-bakis" title="Reklam, CRM ve Finans" description="Instagram mesajları, adaylar, kampanyalar, satış ve nakit akışı." brand="işletme." icon={<Building2 size={18} />} /> : null}
        </div> : <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">Hesabınıza henüz aktif bir ürün erişimi tanımlanmamış. Yönetim ekibiyle iletişime geçin.</div>}
      </div>
    </PanelShell>
  );
}

function ProductCard({ href, title, description, logo, brand, icon, wideLogo = false }: { href: string; title: string; description: string; logo?: string; brand?: string; icon: React.ReactNode; wideLogo?: boolean }) {
  return <Link href={href} aria-label={`${title} paneline git`} className="group flex min-h-64 flex-col rounded-[26px] border border-[var(--site-line)] bg-white p-6 shadow-[var(--panel-card-shadow)] transition hover:-translate-y-0.5 hover:border-[var(--brand-olive)]">
    <div className="flex items-start justify-between gap-4">{logo ? <Image src={logo} alt={title} width={1050} height={wideLogo ? 200 : 1050} className={`h-auto ${wideLogo ? "w-48" : "w-20"}`} /> : <span className="text-3xl font-black tracking-[-.06em] text-[var(--site-ink)]">{brand}</span>}<span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--brand-olive-soft)] text-[var(--brand-olive)]">{icon}</span></div>
    <div className="mt-auto pt-8"><h2 className="text-xl font-bold tracking-[-.03em] text-[var(--site-ink)]">{title}</h2><p className="mt-2 text-sm leading-6 text-[var(--site-body)]">{description}</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold text-[var(--brand-olive)]">Panele git <ArrowRight size={14} className="transition group-hover:translate-x-1" /></span></div>
  </Link>;
}
