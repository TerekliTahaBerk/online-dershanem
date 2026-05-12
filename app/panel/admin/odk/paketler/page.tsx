import type { Metadata } from "next";
import Link from "next/link";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const metadata: Metadata = {
  title: "ODK Paketleri · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const fmtTRY = (cents: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(
    cents / 100,
  );

export default async function AdminOdkPackagesPage() {
  await requireOdkPanel("admin");

  const packages = await prisma.odkPackage.findMany({
    orderBy: [{ isActive: "desc" }, { priceCents: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      priceCents: true,
      durationDays: true,
      isActive: true,
      _count: {
        select: { packageExams: true, packageAccessTags: true, entitlements: true, orders: true },
      },
    },
  });

  const totalActive = packages.filter((p) => p.isActive).length;
  const totalEntitlements = packages.reduce((s, p) => s + p._count.entitlements, 0);

  return (
    <>
      <PageHeader
        title="ODK Paketleri"
        subtitle={`${packages.length} paket · ${totalActive} aktif · ${totalEntitlements} entitlement`}
        right={
          <Link href="/odk-paketleri" className="od-btn">
            Public katalog
          </Link>
        }
      />

      <Card>
        <CardHeader
          title="Tüm paketler"
          subtitle="Public katalogta gösterilen ve gizli paketler"
        />
        <CardBody>
          {packages.length === 0 ? (
            <EmptyState
              icon="package"
              title="Henüz paket yok"
              description="ODK paketleri Prisma seed veya admin yönetim ekranından eklenir. (Yakında: paket düzenleme UI)"
            />
          ) : (
            <table className="od-table">
              <thead>
                <tr>
                  <th>Paket</th>
                  <th>Slug</th>
                  <th>Fiyat</th>
                  <th>Süre</th>
                  <th>Deneme</th>
                  <th>Tag</th>
                  <th>Sipariş</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.title}</strong>
                      {p.description ? (
                        <div className="od-muted" style={{ fontSize: 11, maxWidth: 320 }}>
                          {p.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="od-mono" style={{ fontSize: 11 }}>{p.slug}</td>
                    <td className="od-mono">{fmtTRY(p.priceCents)}</td>
                    <td>{p.durationDays ? `${p.durationDays} gün` : "Süresiz"}</td>
                    <td>{p._count.packageExams}</td>
                    <td>{p._count.packageAccessTags}</td>
                    <td>{p._count.orders}</td>
                    <td>
                      {p.isActive ? (
                        <Badge tone="ok">Aktif</Badge>
                      ) : (
                        <Badge tone="neutral">Pasif</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </>
  );
}
