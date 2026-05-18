import type { Metadata } from "next";
import Link from "next/link";
import { requireParentWithChildren } from "@/lib/odk/parent";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const metadata: Metadata = {
  title: "Zayıf Kazanımlar · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ParentOutcomesIndex() {
  const { children } = await requireParentWithChildren();
  return (
    <>
      <PageHeader title="Zayıf Kazanımlar" subtitle="Görüntülemek istediğin çocuğu seç" />
      <Card>
        <CardHeader title="Çocuk seç" />
        <CardBody>
          {children.length === 0 ? (
            <EmptyState
              title="Bağlı çocuk yok"
              description="Hesabınıza henüz çocuk eşleştirilmemiş. Lütfen okul yöneticinizle iletişime geçin."
              action={<Link href="/iletisim" className="od-btn od-btn-sm od-btn-primary">İletişime geç</Link>}
            />
          ) : (
            <div className="od-grid g-3">
              {children.map((c) => (
                <Link
                  key={c.studentId}
                  href={`/panel/veli/odk/cocuklarim/${c.userId}/kazanim`}
                  className="od-btn od-btn-ghost"
                  style={{ justifyContent: "flex-start" }}
                >
                  {c.name ?? c.email ?? "—"} →
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}
