import { denemeLigiBrand } from "@/lib/deneme-ligi-brand";
import { BrandedProductMenuItem } from "./branded-product-menu-item";

export function DenemeLigiMenuItem(props: { active: boolean; onNavigate: () => void; summary: string }) {
  return <BrandedProductMenuItem {...props} href={denemeLigiBrand.href} />;
}
