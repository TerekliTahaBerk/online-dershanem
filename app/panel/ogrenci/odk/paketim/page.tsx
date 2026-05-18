import Link from "next/link";
import type { Metadata } from "next";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const metadata: Metadata = {
  title: "Paketlerim · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const fmtDate = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(d) : "—";
const fmtPrice = (cents: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(cents / 100);

function daysBetween(a: Date, b: Date) {
  return Math.ceil((a.getTime() - b.getTime()) / 86_400_000);
}

export default async function StudentOdkPaketimPage() {
  const ctx = await requireOdkPanel("ogrenci");
  const now = new Date();

  const [entitlements, accessTags] = await Promise.all([
    prisma.odkEntitlement.findMany({
      where: { userId: ctx.userId },
      include: {
        package: {
          select: {
            id: true, title: true, slug: true, priceCents: true, durationDays: true,
            packageExams: { select: { examId: true } },
          },
        },
      },
      orderBy: [{ status: "asc" }, { startsAt: "desc" }],
    }),
    prisma.odkUserAccessTag.findMany({
      where: { userId: ctx.userId },
      include: {
        accessTag: { select: { id: true, title: true, key: true, service: true, isActive: true } },
      },
      orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const active = entitlements.filter((e) => {
    if (e.status !== "ACTIVE") return false;
    if (e.revokedAt) return false;
    if (e.expiresAt && e.expiresAt.getTime() < now.getTime()) return false;
    return true;
  });
  const inactive = entitlements.filter((e) => !active.includes(e));

  const activeTags = accessTags.filter((t) => {
    if (t.revokedAt) return false;
    if (t.expiresAt && t.expiresAt.getTime() < now.getTime()) return false;
    return t.accessTag.isActive;
  });
  const inactiveTags = accessTags.filter((t) => !activeTags.includes(t));

  return (
    <>
      <PageHeader
        title="Paketlerim ve Erişimlerim"
        subtitle="Aktif ODK paketlerini, kalan sürelerini ve erişim etiketlerini buradan görebilirsin"
        right={
          <Link href="/odk-paketleri" className="od-btn od-btn-primary">
            Yeni paket al
          </Link>
        }
      />

      <Card>
        <CardHeader title="Aktif paketlerim" subtitle={`${active.length} aktif paket`} />
        <CardBody>
          {active.length === 0 ? (
            <EmptyState
              title="Aktif paketin yok"
              description="ODK denemelerine erişmek için bir paket satın alabilirsin."
              action={<Link href="/odk-paketleri" className="od-btn od-btn-primary">Paketleri incele</Link>}
            />
          ) : (
            <div className="od-grid g-2">
              {active.map((e) => {
                const remaining = e.expiresAt ? daysBetween(e.expiresAt, now) : null;
                const lowDays = remaining !== null && remaining <= 7;
                return (
                  <div
                    key={e.id}
                    style={{
                      background: "white",
                      border: "1px solid var(--pd-line)",
                      borderRadius: 12,
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <strong style={{ fontSize: 16 }}>{e.package.title}</strong>
                      <Badge tone="ok">Aktif</Badge>
                    </div>
                    <div className="od-muted" style={{ fontSize: 13 }}>
                      {e.package.packageExams.length} deneme · {fmtPrice(e.package.priceCents)}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
                      <div>
                        <div className="od-muted">Başlangıç</div>
                        <div><strong>{fmtDate(e.startsAt)}</strong></div>
                      </div>
                      <div>
                        <div className="od-muted">Bitiş</div>
                        <div>
                          {e.expiresAt ? (
                            <strong>{fmtDate(e.expiresAt)}</strong>
                          ) : (
                            <strong style={{ color: "var(--od-olive)" }}>Süresiz</strong>
                          )}
                        </div>
                      </div>
                    </div>
                    {remaining !== null ? (
                      <div>
                        <Badge tone={lowDays ? "warn" : "neutral"}>
                          {remaining > 0 ? `${remaining} gün kaldı` : "Bugün sona eriyor"}
                        </Badge>
                      </div>
                    ) : null}
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <Link href="/panel/ogrenci/odk/denemeler" className="od-btn od-btn-sm">
                        Denemelere git
                      </Link>
                      <Link href={`/odk-paketleri/${e.package.slug}`} className="od-btn od-btn-sm od-btn-ghost">
                        Detay
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <CardHeader title="Aktif erişim etiketlerim" subtitle="Bu etiketler hangi denemelere girebileceğini belirler" />
        <CardBody>
          {activeTags.length === 0 ? (
            <EmptyState
              title="Erişim etiketin yok"
              description="Bir paket satın aldığında veya yönetici tarafından eklendiğinde burada listelenir."
            />
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {activeTags.map((t) => {
                const remaining = t.expiresAt ? daysBetween(t.expiresAt, now) : null;
                const lowDays = remaining !== null && remaining <= 7;
                return (
                  <div
                    key={t.id}
                    style={{
                      border: "1px solid var(--pd-line)",
                      borderRadius: 999,
                      padding: "6px 12px",
                      background: "white",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                    }}
                  >
                    <strong>{t.accessTag.title}</strong>
                    {remaining !== null ? (
                      <span className="od-muted" style={{ color: lowDays ? "var(--od-warn, #b45309)" : undefined }}>
                        · {remaining > 0 ? `${remaining} gün` : "bugün biter"}
                      </span>
                    ) : (
                      <span className="od-muted">· süresiz</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {inactive.length > 0 ? (
        <Card style={{ marginTop: 16 }}>
          <CardHeader title="Eski / pasif paketlerim" subtitle={`${inactive.length} kayıt`} />
          <CardBody>
            <table className="od-table">
              <thead>
                <tr>
                  <th>Paket</th>
                  <th>Durum</th>
                  <th>Başlangıç</th>
                  <th>Bitiş</th>
                </tr>
              </thead>
              <tbody>
                {inactive.map((e) => {
                  const expired = e.expiresAt && e.expiresAt.getTime() < now.getTime();
                  const tone: "neutral" | "bad" | "warn" =
                    e.revokedAt ? "bad" : expired ? "warn" : "neutral";
                  const label =
                    e.revokedAt ? "İptal" :
                    expired ? "Süresi doldu" :
                    e.status === "EXPIRED" ? "Süresi doldu" :
                    e.status === "REVOKED" ? "İptal" : e.status;
                  return (
                    <tr key={e.id}>
                      <td><strong>{e.package.title}</strong></td>
                      <td><Badge tone={tone}>{label}</Badge></td>
                      <td>{fmtDate(e.startsAt)}</td>
                      <td>{fmtDate(e.expiresAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : null}

      {inactiveTags.length > 0 ? (
        <Card style={{ marginTop: 16 }}>
          <CardHeader title="Eski / iptal edilmiş etiketler" />
          <CardBody>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {inactiveTags.map((t) => (
                <span
                  key={t.id}
                  style={{
                    border: "1px dashed var(--pd-line)",
                    borderRadius: 999,
                    padding: "4px 10px",
                    fontSize: 12,
                    color: "var(--od-muted, #6b7280)",
                    background: "transparent",
                  }}
                >
                  {t.accessTag.title}
                  {t.revokedAt ? " · iptal" : t.expiresAt ? " · süre doldu" : ""}
                </span>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}
    </>
  );
}
