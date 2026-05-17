import type { Metadata } from "next";
import Link from "next/link";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const metadata: Metadata = {
  title: "ODK Paketleri · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const fmtTRY = (cents: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(cents / 100);

export default async function AdminOdkPackagesPage() {
  await requireOdkPanel("admin");

  const packages = await prisma.odkPackage.findMany({
    orderBy: [{ isFeatured: "desc" }, { isActive: "desc" }, { priceCents: "asc" }],
    include: {
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
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/deneme-kulubu#paketler" className="od-btn od-btn-ghost od-btn-sm">
              Public katalog
            </Link>
            <Link
              href="/panel/admin/odk/paketler/yeni"
              className="od-btn od-btn-primary od-btn-sm"
            >
              + Yeni paket
            </Link>
          </div>
        }
      />

      <Card>
        {packages.length === 0 ? (
          <div style={{ padding: 16 }}>
            <EmptyState
              icon="package"
              title="Henüz ODK paketi yok"
              description="+ Yeni paket ile ilk ODK paketinizi oluşturun."
            />
          </div>
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {packages.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.title}</strong>
                    {p.isFeatured ? (
                      <Badge tone="purple">★ Öne çıkan</Badge>
                    ) : null}
                    {p.description ? (
                      <div className="od-muted" style={{ fontSize: 11, maxWidth: 320 }}>
                        {p.description}
                      </div>
                    ) : null}
                  </td>
                  <td className="od-mono" style={{ fontSize: 11 }}>
                    {p.slug}
                  </td>
                  <td className="od-mono">
                    {fmtTRY(p.priceCents)}
                    {p.originalPriceCents && p.originalPriceCents > p.priceCents ? (
                      <div className="od-muted" style={{ fontSize: 11, textDecoration: "line-through" }}>
                        {fmtTRY(p.originalPriceCents)}
                      </div>
                    ) : null}
                  </td>
                  <td>{p.durationDays ? `${p.durationDays} gün` : "Süresiz"}</td>
                  <td>{p._count.packageExams}</td>
                  <td>{p._count.packageAccessTags}</td>
                  <td>{p._count.orders}</td>
                  <td>
                    {p.isActive ? <Badge tone="ok">Aktif</Badge> : <Badge tone="neutral">Pasif</Badge>}
                  </td>
                  <td>
                    <Link
                      href={`/panel/admin/odk/paketler/${p.id}`}
                      className="od-btn od-btn-ghost od-btn-sm"
                    >
                      Detay
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
