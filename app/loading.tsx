import { RouteLoading } from "@/components/site/route-loading";
import { SiteHeader } from "@/components/site/site-header";
import PanelLoading from "@/app/panel/loading";

/**
 * Kök yükleme sınırı — public sayfalar arası geçişte (ör. ana sayfa →
 * hakkımızda) Link prefetch'i bu iskeleti önceden alır, tıklama anında
 * gösterilir. Hedef adrese göre doğru kabuk `RouteLoading` içinde seçilir.
 */
export default function Loading() {
  return <RouteLoading siteHeader={<SiteHeader />} panelLoading={<PanelLoading />} />;
}
