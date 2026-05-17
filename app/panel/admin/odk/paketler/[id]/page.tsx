import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import {
  toggleOdkPackageActiveAction,
  setOdkPackageTagsAction,
  setOdkPackageExamsAction,
  deleteOdkPackageAction,
} from "../_actions";

export const metadata: Metadata = {
  title: "ODK Paket Detayı · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const fmtTRY = (cents: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(cents / 100);

export default async function OdkPackageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOdkPanel("admin");
  const { id } = await params;

  const pkg = await prisma.odkPackage.findUnique({
    where: { id },
    include: {
      packageAccessTags: { include: { accessTag: true } },
      packageExams: { include: { exam: { select: { id: true, title: true } } } },
      _count: { select: { orders: true, entitlements: true } },
    },
  });
  if (!pkg) notFound();

  const [allTags, allExams] = await Promise.all([
    prisma.odkAccessTag.findMany({
      where: { service: "ODK", isActive: true },
      orderBy: { title: "asc" },
    }),
    prisma.odkExam.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, title: true },
    }),
  ]);

  const selectedTagIds = new Set(pkg.packageAccessTags.map((t) => t.accessTagId));
  const selectedExamIds = new Set(pkg.packageExams.map((t) => t.exam.id));

  return (
    <>
      <PageHeader
        title={pkg.title}
        subtitle={
          "ODK Paket · " +
          fmtTRY(pkg.priceCents) +
          (pkg.durationDays ? ` · ${pkg.durationDays} gün` : " · Süresiz") +
          (pkg.isActive ? " · Aktif" : " · Pasif") +
          (pkg.isFeatured ? " · ★ Öne çıkan" : "")
        }
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/panel/admin/odk/paketler" className="od-btn od-btn-ghost od-btn-sm">
              ← Liste
            </Link>
            <Link
              href={`/panel/admin/odk/paketler/${pkg.id}/duzenle`}
              className="od-btn od-btn-primary od-btn-sm"
            >
              Düzenle
            </Link>
            <form action={toggleOdkPackageActiveAction.bind(null, pkg.id)}>
              <button type="submit" className="od-btn od-btn-ghost od-btn-sm">
                {pkg.isActive ? "Pasifleştir" : "Aktifleştir"}
              </button>
            </form>
          </div>
        }
      />

      <div className="od-grid g-2" style={{ marginBottom: 16 }}>
        <Card>
          <CardHeader title="Özet" subtitle="Paket meta bilgileri" />
          <CardBody>
            <dl style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 6, fontSize: 13 }}>
              <dt className="od-muted">Slug</dt>
              <dd className="od-mono" style={{ fontSize: 12 }}>{pkg.slug}</dd>
              <dt className="od-muted">Fiyat</dt>
              <dd className="od-mono">{fmtTRY(pkg.priceCents)}</dd>
              {pkg.originalPriceCents ? (
                <>
                  <dt className="od-muted">Eski fiyat</dt>
                  <dd className="od-mono" style={{ textDecoration: "line-through" }}>
                    {fmtTRY(pkg.originalPriceCents)}
                  </dd>
                </>
              ) : null}
              <dt className="od-muted">Süre</dt>
              <dd>{pkg.durationDays ? `${pkg.durationDays} gün` : "Süresiz"}</dd>
              <dt className="od-muted">CTA metni</dt>
              <dd>{pkg.ctaText ?? "—"}</dd>
              <dt className="od-muted">Sipariş</dt>
              <dd>{pkg._count.orders}</dd>
              <dt className="od-muted">Entitlement</dt>
              <dd>{pkg._count.entitlements}</dd>
            </dl>
            {pkg.description ? (
              <p style={{ marginTop: 12, fontSize: 13, color: "var(--pd-ink-2)" }}>{pkg.description}</p>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Erişim Tagları"
            subtitle="Bu pakete satın alanlar otomatik bu tagları alır"
          />
          <CardBody>
            {allTags.length === 0 ? (
              <EmptyState
                title="Aktif ODK tagı yok"
                description="Önce Erişim Tagları sayfasından bir tag oluşturun."
              />
            ) : (
              <form action={setOdkPackageTagsAction.bind(null, pkg.id)} className="od-form">
                <div style={{ display: "grid", gap: 6, maxHeight: 280, overflowY: "auto" }}>
                  {allTags.map((t) => (
                    <label
                      key={t.id}
                      style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}
                    >
                      <input
                        type="checkbox"
                        name="tagIds"
                        value={t.id}
                        defaultChecked={selectedTagIds.has(t.id)}
                      />
                      <span>
                        <strong>{t.title}</strong>{" "}
                        <span className="od-muted od-mono" style={{ fontSize: 11 }}>
                          {t.key}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <div style={{ marginTop: 8, textAlign: "right" }}>
                  <button type="submit" className="od-btn od-btn-primary od-btn-sm">
                    Tagları kaydet
                  </button>
                </div>
              </form>
            )}
          </CardBody>
        </Card>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <CardHeader
          title="Deneme erişim kapsamı"
          subtitle="Bu pakete bağlı denemeler — entitlement üzerinden erişim verilir"
        />
        <CardBody>
          {allExams.length === 0 ? (
            <EmptyState title="Henüz deneme yok" description="Önce ODK denemesi oluşturun." />
          ) : (
            <form action={setOdkPackageExamsAction.bind(null, pkg.id)} className="od-form">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: 6,
                  maxHeight: 320,
                  overflowY: "auto",
                }}
              >
                {allExams.map((e) => (
                  <label
                    key={e.id}
                    style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}
                  >
                    <input
                      type="checkbox"
                      name="examIds"
                      value={e.id}
                      defaultChecked={selectedExamIds.has(e.id)}
                    />
                    <span>{e.title}</span>
                  </label>
                ))}
              </div>
              <div style={{ marginTop: 8, textAlign: "right" }}>
                <button type="submit" className="od-btn od-btn-primary od-btn-sm">
                  Denemeleri kaydet
                </button>
              </div>
            </form>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Tehlikeli bölge" subtitle="Silme — sipariş yoksa fiziksel; varsa pasifleştirir" />
        <CardBody>
          <form action={deleteOdkPackageAction.bind(null, pkg.id)}>
            <button
              type="submit"
              className="od-btn od-btn-ghost od-btn-sm"
              style={{ color: "var(--pd-bad)" }}
            >
              Paketi sil / pasifleştir
            </button>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
