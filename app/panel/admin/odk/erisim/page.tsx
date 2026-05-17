import type { Metadata } from "next";
import Link from "next/link";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { KpiCard } from "@/components/panel/ui/kpi-card";
import { toggleAccessTagAction, deleteAccessTagAction } from "./_actions";

export const metadata: Metadata = {
  title: "Erişim Tagları · ODK Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminOdkAccessPage() {
  await requireOdkPanel("admin");

  const now = new Date();

  const [tags, recentGrants, totalUsersWithODK, totalUsersWithOD] = await Promise.all([
    prisma.odkAccessTag.findMany({
      orderBy: [{ service: "asc" }, { isActive: "desc" }, { title: "asc" }],
      select: {
        id: true,
        key: true,
        title: true,
        service: true,
        description: true,
        isActive: true,
        _count: {
          select: { userTags: true, examTags: true, packageTags: true },
        },
      },
    }),
    prisma.odkUserAccessTag.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      where: { revokedAt: null },
      select: {
        id: true,
        source: true,
        expiresAt: true,
        createdAt: true,
        user: { select: { name: true, email: true, role: true } },
        accessTag: { select: { key: true, title: true, service: true } },
      },
    }),
    prisma.odkUserAccessTag.findMany({
      where: {
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        accessTag: { service: "ODK", isActive: true },
      },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.odkUserAccessTag.findMany({
      where: {
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        accessTag: { service: "OD", isActive: true },
      },
      distinct: ["userId"],
      select: { userId: true },
    }),
  ]);

  const fmtDate = (d: Date | null) =>
    d ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(d) : "—";

  return (
    <>
      <PageHeader
        title="Erişim Tagları"
        subtitle="OD (OnlineDershanem) ve ODK (OnlineDenemeKulübü) ürün erişim katmanı"
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/panel/admin/odk/erisim/kullanicilar" className="od-btn od-btn-ghost">
              Kullanıcı erişimleri →
            </Link>
            <Link href="/panel/admin/odk/erisim/bulk" className="od-btn od-btn-ghost">
              Toplu CSV
            </Link>
            <Link href="/panel/admin/odk/erisim/yeni" className="od-btn od-btn-primary">
              + Yeni tag
            </Link>
          </div>
        }
      />

      <div className="od-kpi-grid">
        <KpiCard label="Toplam Tag" value={tags.length} meta={`${tags.filter((t) => t.isActive).length} aktif`} />
        <KpiCard label="ODK Erişimli Kullanıcı" value={totalUsersWithODK.length} meta="Aktif tag · süresi geçmemiş" />
        <KpiCard label="OD Erişimli Kullanıcı" value={totalUsersWithOD.length} meta="Aktif tag · süresi geçmemiş" />
      </div>

      <div style={{ marginTop: 16 }}>
        <Card>
          <CardHeader
            title="Tag tanımları"
            subtitle="Servis bazında erişim tagları"
          />
          <CardBody>
            {tags.length === 0 ? (
              <EmptyState
                icon="shield"
                title="Tag yok"
                description="Seed scriptiyle OD/ODK default tagları eklenir."
              />
            ) : (
              <table className="od-table">
                <thead>
                  <tr>
                    <th>Servis</th>
                    <th>Key</th>
                    <th>Başlık</th>
                    <th>Kullanıcı</th>
                    <th>Deneme</th>
                    <th>Paket</th>
                    <th>Durum</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {tags.map((t) => {
                    const totalUsage = t._count.userTags + t._count.examTags + t._count.packageTags;
                    const toggle = toggleAccessTagAction.bind(null, t.id, !t.isActive);
                    const remove = deleteAccessTagAction.bind(null, t.id);
                    return (
                      <tr key={t.id}>
                        <td>
                          <Badge tone={t.service === "ODK" ? "purple" : "accent"}>{t.service}</Badge>
                        </td>
                        <td className="od-mono" style={{ fontSize: 11 }}>{t.key}</td>
                        <td>
                          <strong>{t.title}</strong>
                          {t.description ? (
                            <div className="od-muted" style={{ fontSize: 11 }}>{t.description}</div>
                          ) : null}
                        </td>
                        <td>{t._count.userTags}</td>
                        <td>{t._count.examTags}</td>
                        <td>{t._count.packageTags}</td>
                        <td>
                          {t.isActive ? <Badge tone="ok">Aktif</Badge> : <Badge tone="neutral">Pasif</Badge>}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            <Link
                              href={`/panel/admin/odk/erisim/${t.id}/duzenle`}
                              className="od-btn od-btn-ghost"
                              style={{ fontSize: 11, padding: "4px 8px" }}
                            >
                              Düzenle
                            </Link>
                            <form action={toggle} style={{ display: "inline" }}>
                              <button
                                type="submit"
                                className="od-btn od-btn-ghost"
                                style={{ fontSize: 11, padding: "4px 8px" }}
                              >
                                {t.isActive ? "Pasifleştir" : "Aktifleştir"}
                              </button>
                            </form>
                            <form action={remove} style={{ display: "inline" }}>
                              <button
                                type="submit"
                                className="od-btn od-btn-ghost"
                                style={{ fontSize: 11, padding: "4px 8px", color: "var(--pd-bad, #b91c1c)" }}
                                title={totalUsage > 0 ? "Kullanımda olduğu için pasifleştirilecek" : "Kalıcı silinecek"}
                              >
                                {totalUsage > 0 ? "Pasif" : "Sil"}
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>

      <div style={{ marginTop: 16 }}>
        <Card>
          <CardHeader title="Son tag atamaları" subtitle="En son verilen 25 erişim" />
          <CardBody>
            {recentGrants.length === 0 ? (
              <EmptyState title="Atama yok" />
            ) : (
              <table className="od-table">
                <thead>
                  <tr>
                    <th>Kullanıcı</th>
                    <th>Tag</th>
                    <th>Kaynak</th>
                    <th>Bitiş</th>
                    <th>Verildi</th>
                  </tr>
                </thead>
                <tbody>
                  {recentGrants.map((g) => (
                    <tr key={g.id}>
                      <td>
                        <strong style={{ fontSize: 12 }}>{g.user.name ?? "—"}</strong>
                        <div className="od-muted" style={{ fontSize: 11 }}>
                          {g.user.email} · {g.user.role}
                        </div>
                      </td>
                      <td>
                        <Badge tone={g.accessTag.service === "ODK" ? "purple" : "accent"}>
                          {g.accessTag.service}
                        </Badge>{" "}
                        <span style={{ fontSize: 12 }}>{g.accessTag.title}</span>
                      </td>
                      <td>
                        <Badge tone="neutral">{g.source}</Badge>
                      </td>
                      <td className="od-muted" style={{ fontSize: 11 }}>{fmtDate(g.expiresAt)}</td>
                      <td className="od-muted" style={{ fontSize: 11 }}>{fmtDate(g.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
