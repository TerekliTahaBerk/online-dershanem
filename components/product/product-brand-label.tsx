import Image from "next/image";
import { publicProductBrand } from "@/lib/public-product-brands";

/** One public brand hierarchy for menus, cards, tables and package choices. */
export function ProductBrandLabel({ href, fallback, compact = false, mascot = false }: {
  href: string;
  fallback: string;
  compact?: boolean;
  mascot?: boolean;
}) {
  const brand = publicProductBrand(href);
  if (!brand) return <>{fallback}</>;
  return (
    <span data-product-brand={brand.tone} className={`inline-block max-w-full leading-normal ${brand.tone === "blue" ? "text-[#0754C9]" : "text-[#5B2599]"}`}>
      <span className={compact ? "sr-only" : "block text-[12px] font-semibold tracking-normal text-dc-ink-muted"}>{brand.parentName} </span>
      <span className="inline-flex max-w-full items-center gap-1.5 align-middle">
        <span>{compact ? <span className="sr-only">× </span> : "× "}{brand.shortName}</span>
        {mascot ? <Image src={brand.mascot} alt="" width={1254} height={1254} sizes="18px" className="h-[18px] w-[18px] shrink-0 rounded-[4px] object-contain" /> : null}
      </span>
    </span>
  );
}
