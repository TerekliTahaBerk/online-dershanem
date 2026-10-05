import Link from "next/link";
import { publicProductBrand } from "@/lib/public-product-brands";
import { ProductBrandLabel } from "@/components/product/product-brand-label";

export function BrandedProductMenuItem({ href, active, onNavigate, summary }: {
  href: string; active: boolean; onNavigate: () => void; summary: string;
}) {
  const brand = publicProductBrand(href)!;
  return (
    <div className={`rounded-od px-3 py-2.5 transition-colors motion-reduce:transition-none ${brand.tone === "blue" ? "hover:bg-blue-50" : "hover:bg-purple-50"}`}>
      <Link href={href} onClick={onNavigate} aria-label={brand.name} aria-current={active ? "page" : undefined}
        className={`flex min-h-11 items-center rounded-sm text-[15px] font-bold focus-visible:outline-2 focus-visible:outline-offset-4 ${brand.tone === "blue" ? "focus-visible:outline-blue-700" : "focus-visible:outline-purple-700"}`}>
        <ProductBrandLabel href={href} fallback={brand.name} mascot />
      </Link>
      <span className="mt-0.5 block text-[13px] leading-normal text-dc-ink-muted">{summary}</span>
    </div>
  );
}
