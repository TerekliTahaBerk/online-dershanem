import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePanelRole } from "@/lib/panel-access";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";
import {
  grantUserAccessAction,
  revokeUserAccessAction,
  restoreUserAccessAction,
} from "../../_actions";

export const metadata: Metadata = {
  title: "Kullanıcı Erişimi · ODK Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function UserAccessDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requirePanelRole("admin");
  const { userId } = await params;

  const [user, activeTags, allUserTags] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
    prisma.odkAccessTag.findMany({
      where: { isActive: true },
      orderBy: [{ service: "asc" }, { title: "asc" }],
      select: { id: true, key: true, title: true, service: true },
    }),
    prisma.odkUserAccessTag.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        source: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        grantedById: true,
        accessTag: { select: { id: true, key: true, title: true, service: true, isActive: true } },
      },
    }),
  ]);

  if (!user) notFound();

  const now = new Date();
  const fmtDate = (d: Date | null) =>
    d ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(d) : "—";

  const isActiveGrant = (g: (typeof allUserTags)[number]) =>
    !g.revokedAt && (!g.expiresAt || g.expiresAt > now) && g.accessTag.isActive;

  const services = new Set(
    allUserTags.filter(isActiveGrant).map((g) => g.accessTag.service),
  );

  return (
    <>
      <PageHeader
        title={user.name ?? user.email}
        subtitle={`${user.email} · ${user.role}`}
        right={
          <Link href="/panel/admin/odk/erisim/kullanicilar" className="od-btn od-btn-ghost">
            ← Kullanıcı listesi
          </Link>
        }
      />

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}>
        <Card>
          <CardHeader title="Tüm tag kayıtları" subtitle="Aktif, süresi geçmiş ve iptal edilmiş tüm atamalar" />
          <CardBody>
            {allUserTags.length === 0 ? (
              <EmptyState title="Hiç tag atanmamış" />
            ) : (
              <table className="od-table">
                <thead>
                  <tr>
                    <th>Servis</th>
                    <th>Tag</th>
                    <th>Kaynak</th>
                    <th>Bitiş</th>
                    <th>Verildi</th>
                    <th>Durum</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {allUserTags.map((g) => {
                    const active = isActiveGrant(g);
                    const expired = g.expiresAt && g.expiresAt <= now;
                    const revoke = revokeUserAccessAction.bind(null, g.id, userId);
                    const restore = restoreUserAccessAction.bind(null, g.id, userId);
                    return (
                      <tr key={g.id}>
                        <td>
                          <Badge tone={g.accessTag.service === "ODK" ? "purple" : "accent"}>
                            {g.accessTag.service}
                          </Badge>
                        </td>
                        <td>
                          <strong style={{ fontSize: 12 }}>{g.accessTag.title}</strong>
                          <div className="od-mono od-muted" style={{ fontSize: 10 }}>{g.accessTag.key}</div>
                        </td>
                        <td>
                          <Badge tone="neutral">{g.source}</Badge>
                        </td>
                        <td className="od-muted" style={{ fontSize: 11 }}>{fmtDate(g.expiresAt)}</td>
                        <td className="od-muted" style={{ fontSize: 11 }}>{fmtDate(g.createdAt)}</td>
                        <td>
                          {g.revokedAt ? (
                            <Badge tone="neutral">İptal</Badge>
                          ) : !g.accessTag.isActive ? (
                            <Badge tone="neutral">Tag pasif</Badge>
                          ) : expired ? (
                            <Badge tone="warn">Süresi doldu</Badge>
                          ) : (
                            <Badge tone="ok">Aktif</Badge>
                          )}
                        </td>
                        <td>
                          {active ? (
                            <form action={revoke}>
                              <button type="submit" className="od-btn" style={{ color: "var(--pd-bad, #b91c1c)" }}>
                                İptal et
                              </button>
                            </form>
                          ) : g.revokedAt ? (
                            <form action={restore}>
                              <button type="submit" className="od-btn">
                                Geri ver
                              </button>
                            </form>
                          ) : (
                            <span className="od-muted" style={{ fontSize: 11 }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <Card>
            <CardHeader title="Aktif erişim" />
            <CardBody>
              <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="od-muted">OD (OnlineDershanem)</span>
                  {services.has("OD") ? <Badge tone="ok">Var</Badge> : <Badge tone="neutral">Yok</Badge>}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="od-muted">ODK (Deneme Kulübü)</span>
                  {services.has("ODK") ? <Badge tone="ok">Var</Badge> : <Badge tone="neutral">Yok</Badge>}
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Manuel tag ata" subtitle="Bu kullanıcıya yeni bir erişim tagı ver" />
            <CardBody>
              {activeTags.length === 0 ? (
                <p className="od-muted" style={{ fontSize: 12 }}>
                  Aktif tag yok. Önce{" "}
                  <Link href="/panel/admin/odk/erisim/yeni">yeni bir tag oluşturun</Link>.
                </p>
              ) : (
                <form action={grantUserAccessAction} style={{ display: "grid", gap: 12 }}>
                  <input type="hidden" name="userId" value={user.id} />

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>Tag *</span>
                    <select name="accessTagId" required className="od-select">
                      {activeTags.map((t) => (
                        <option key={t.id} value={t.id}>
                          [{t.service}] {t.title}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>Bitiş (opsiyonel)</span>
                    <input
                      type="datetime-local"
                      name="expiresAt"
                      className="od-input"
                    />
                    <span className="od-muted" style={{ fontSize: 11 }}>
                      Boş bırakılırsa süresiz erişim.
                    </span>
                  </label>

                  <button type="submit" className="od-btn od-btn-primary">
                    Tagı ata
                  </button>
                </form>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
