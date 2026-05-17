import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePanelRole } from "@/lib/panel-access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import {
  updateAccessTagAction,
  toggleAccessTagAction,
  deleteAccessTagAction,
} from "../../_actions";

export const metadata: Metadata = {
  title: "Erişim Tagı Düzenle · ODK Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditAccessTagPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePanelRole("admin");
  const { id } = await params;

  const tag = await prisma.odkAccessTag.findUnique({
    where: { id },
    select: {
      id: true,
      key: true,
      title: true,
      description: true,
      service: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { userTags: true, examTags: true, packageTags: true } },
    },
  });

  if (!tag) notFound();

  const totalUsage = tag._count.userTags + tag._count.examTags + tag._count.packageTags;

  const update = updateAccessTagAction.bind(null, tag.id);
  const toggle = toggleAccessTagAction.bind(null, tag.id, !tag.isActive);
  const remove = deleteAccessTagAction.bind(null, tag.id);

  return (
    <>
      <PageHeader
        title={`Tag: ${tag.title}`}
        subtitle={`Anahtar: ${tag.key}`}
        right={
          <Link href="/panel/admin/odk/erisim" className="od-btn od-btn-ghost">
            ← Listeye dön
          </Link>
        }
      />

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}>
        <Card>
          <CardHeader title="Tag bilgileri" subtitle="Anahtar değiştirilemez. Diğer alanlar güncellenebilir." />
          <CardBody>
            <form action={update} style={{ display: "grid", gap: 16 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Servis *</span>
                <select name="service" defaultValue={tag.service} required className="od-select">
                  <option value="OD">OD — OnlineDershanem</option>
                  <option value="ODK">ODK — OnlineDenemeKulübü</option>
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Başlık *</span>
                <input
                  name="title"
                  required
                  maxLength={120}
                  defaultValue={tag.title}
                  className="od-input"
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Anahtar (key) — readonly</span>
                <input
                  name="key"
                  readOnly
                  disabled
                  value={tag.key}
                  className="od-input od-mono"
                  style={{ background: "var(--pd-soft)" }}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Açıklama</span>
                <textarea
                  name="description"
                  maxLength={1000}
                  rows={3}
                  defaultValue={tag.description ?? ""}
                  className="od-input"
                  style={{ fontFamily: "inherit" }}
                />
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" name="isActive" defaultChecked={tag.isActive} />
                <span style={{ fontSize: 13 }}>Aktif</span>
              </label>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Link href="/panel/admin/odk/erisim" className="od-btn od-btn-ghost">
                  İptal
                </Link>
                <button type="submit" className="od-btn od-btn-primary">
                  Kaydet
                </button>
              </div>
            </form>
          </CardBody>
        </Card>

        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <Card>
            <CardHeader title="Kullanım" />
            <CardBody>
              <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="od-muted">Kullanıcı</span>
                  <strong>{tag._count.userTags}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="od-muted">Deneme</span>
                  <strong>{tag._count.examTags}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="od-muted">Paket</span>
                  <strong>{tag._count.packageTags}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--pd-line)", paddingTop: 8 }}>
                  <span className="od-muted">Durum</span>
                  {tag.isActive ? <Badge tone="ok">Aktif</Badge> : <Badge tone="neutral">Pasif</Badge>}
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Tehlikeli Bölge" />
            <CardBody>
              <div style={{ display: "grid", gap: 10 }}>
                <form action={toggle}>
                  <button type="submit" className="od-btn" style={{ width: "100%" }}>
                    {tag.isActive ? "Pasifleştir" : "Aktifleştir"}
                  </button>
                </form>
                <form action={remove}>
                  <button
                    type="submit"
                    className="od-btn"
                    style={{ width: "100%", color: "var(--pd-bad, #b91c1c)" }}
                  >
                    {totalUsage > 0 ? "Pasifleştirerek sil" : "Sil"}
                  </button>
                  <div className="od-muted" style={{ fontSize: 11, marginTop: 6 }}>
                    {totalUsage > 0
                      ? `Bu tag ${totalUsage} kayıtta kullanılıyor. Silmek yerine pasifleştirilecek.`
                      : "Hiçbir bağlı kayıt yok, kalıcı silinecek."}
                  </div>
                </form>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
