import Link from "next/link";
import { Card } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { PageHeader } from "@/components/panel/ui/page-header";

/**
 * Veli panelinde bağlı çocuk bulunamadığında gösterilen ortak boş durum.
 * Tutarlı açıklama + iletişim CTA sağlar.
 */
export function NoChildEmpty({ pageTitle }: { pageTitle?: string }) {
  const empty = (
    <Card>
      <EmptyState
        icon="users"
        title="Bağlı çocuk yok"
        description="Hesabınıza henüz çocuk eşleştirilmemiş. Eşleştirme için lütfen okul yöneticinizle iletişime geçin."
        action={
          <Link href="/iletisim" className="od-btn od-btn-sm od-btn-primary">
            İletişime geç
          </Link>
        }
      />
    </Card>
  );
  if (!pageTitle) return empty;
  return (
    <>
      <PageHeader title={pageTitle} />
      {empty}
    </>
  );
}
