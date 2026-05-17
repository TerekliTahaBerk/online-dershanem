import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Badge } from "@/components/panel/ui/badge";
import { KpiCard } from "@/components/panel/ui/kpi-card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { UserOutcomeView } from "@/components/panel/odk/user-outcome-view";
import { getUserOutcomeReport } from "@/lib/odk/user-outcomes";
import { InsightList } from "@/components/panel/analytics";
import { odkTrendInsights, lessonWeaknessInsights, sortInsights } from "@/lib/analytics/insights";

export const metadata: Metadata = {
  title: "ODK Öğrenci Detayı · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const fmtDate = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("tr-TR").format(d) : "—";
const fmtTRY = (c: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(c / 100);

type Tab =
  | "genel"
  | "paket"
  | "denemeler"
  | "kazanim"
  | "cheat"
  | "odemeler"
  | "islem";

function parseTab(raw: string | undefined): Tab {
  if (
    raw === "paket" ||
    raw === "denemeler" ||
    raw === "kazanim" ||
    raw === "cheat" ||
    raw === "odemeler" ||
    raw === "islem"
  )
    return raw;
  return "genel";
}

const TAB_LABELS: Record<Tab, string> = {
  genel: "Genel Bakış",
  paket: "Paket / Erişim",
  denemeler: "Deneme Sonuçları",
  kazanim: "Kazanım Analizi",
  cheat: "Cheat Logları",
  odemeler: "Ödemeler",
  islem: "İşlem Geçmişi",
};

export default async function OdkStudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireOdkPanel("admin");
  const { id } = await params;
  const { tab: tabRaw } = await searchParams;
  const tab = parseTab(tabRaw);

  const now = new Date();
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      student: { select: { id: true, fullName: true, phone: true, classLevel: true } },
      odkUserAccessTags: {
        include: { accessTag: { select: { title: true, key: true, service: true } } },
        orderBy: { createdAt: "desc" },
      },
      odkEntitlements: {
        include: {
          package: { select: { id: true, title: true, slug: true, priceCents: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      odkOrders: {
        include: {
          package: { select: { title: true } },
          payments: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      odkAttempts: {
        include: {
          exam: { select: { id: true, title: true } },
        },
        orderBy: { startedAt: "desc" },
        take: 50,
      },
      _count: {
        select: {
          odkAttempts: { where: { status: "SUBMITTED" } },
        },
      },
    },
  });

  if (!user) notFound();

  const hasOD = !!(await prisma.odkUserAccessTag.findFirst({
    where: {
      userId: user.id,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      accessTag: { service: "OD", isActive: true },
    },
    select: { id: true },
  }));

  const activeEnt = user.odkEntitlements.find(
    (e) => e.status === "ACTIVE" && (!e.expiresAt || e.expiresAt > now),
  );
  const hasODK = !!activeEnt || user.odkUserAccessTags.some(
    (t) =>
      !t.revokedAt &&
      (!t.expiresAt || t.expiresAt > now) &&
      t.accessTag.service === "ODK",
  );

  const submittedAttempts = user.odkAttempts.filter((a) => a.status === "SUBMITTED");
  const totalCheat = user.odkAttempts.reduce((s, a) => s + a.cheatViolationCount, 0);
  const avgScore =
    submittedAttempts.length > 0
      ? submittedAttempts.reduce((s, a) => s + Number(a.score ?? 0), 0) /
        submittedAttempts.length
      : null;

  // Bu kullanıcının ödeme/sipariş muhasebe izi
  const accounting = await prisma.accountingEntry.findMany({
    where: {
      service: "ODK",
      OR: [
        { refType: "OdkOrder", refId: { in: user.odkOrders.map((o) => o.id) } },
        { refType: "OdkOrderRefund", refId: { in: user.odkOrders.map((o) => o.id) } },
      ],
    },
    orderBy: { occurredAt: "desc" },
    take: 100,
  });

  const tabHref = (t: Tab) => `?tab=${t}`;

  // Tek-kullanıcı kazanım raporu sadece "kazanim" tabı aktifken çek
  const outcomeReport = tab === "kazanim" ? await getUserOutcomeReport(user.id) : null;

  return (
    <>
      <PageHeader
        title={user.name ?? user.student?.fullName ?? user.email}
        subtitle={
          (user.student?.fullName ? "Öğrenci · " : "Kullanıcı · ") +
          user.email +
          (user.student?.phone ? " · " + user.student.phone : "")
        }
        right={
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Link
              href={`/panel/admin/odk/siparisler/yeni?userId=${user.id}`}
              className="od-btn od-btn-primary od-btn-sm"
            >
              + Manuel paket tanımla
            </Link>
            <Link href="/panel/admin/odk/ogrenciler" className="od-btn od-btn-ghost od-btn-sm">
              ← Liste
            </Link>
          </div>
        }
      />

      {/* Ürün erişim rozetleri */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        <Badge tone={hasOD ? "ok" : "neutral"}>{hasOD ? "OD erişimi ✓" : "OD erişimi yok"}</Badge>
        <Badge tone={hasODK ? "purple" : "neutral"}>
          {hasODK ? "ODK erişimi ✓" : "ODK erişimi yok"}
        </Badge>
        {activeEnt ? (
          <Badge tone="ok">
            Aktif paket: {activeEnt.package.title}
            {activeEnt.expiresAt ? ` (bitiş ${fmtDate(activeEnt.expiresAt)})` : " (süresiz)"}
          </Badge>
        ) : (
          <Badge tone="neutral">Aktif ODK paketi yok</Badge>
        )}
      </div>

      {/* Sekmeler */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap", borderBottom: "1px solid var(--pd-line)", paddingBottom: 8 }}>
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <Link
            key={t}
            href={tabHref(t)}
            className={"od-btn od-btn-sm " + (tab === t ? "od-btn-primary" : "od-btn-ghost")}
          >
            {TAB_LABELS[t]}
          </Link>
        ))}
      </div>

      {tab === "genel" ? (
        <>
          <div className="od-grid g-4" style={{ marginBottom: 12 }}>
            <KpiCard label="Çözülen deneme" value={String(user._count.odkAttempts)} />
            <KpiCard
              label="Ortalama net"
              value={avgScore !== null ? avgScore.toFixed(1) : "—"}
              meta="Submitted attempts"
            />
            <KpiCard label="Cheat olay" value={String(totalCheat)} meta="Tüm denemeler" />
            <KpiCard
              label="Aktif tag"
              value={String(user.odkUserAccessTags.filter((t) => !t.revokedAt).length)}
              meta="ODK + OD"
            />
          </div>
          <Card>
            <CardHeader title="Özet" subtitle="ODK bağlamında genel bakış" />
            <CardBody>
              <dl style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 6, fontSize: 13 }}>
                <dt className="od-muted">User ID</dt>
                <dd className="od-mono" style={{ fontSize: 11 }}>{user.id}</dd>
                <dt className="od-muted">E-posta</dt>
                <dd>{user.email}</dd>
                <dt className="od-muted">Telefon</dt>
                <dd>{user.student?.phone ?? "—"}</dd>
                <dt className="od-muted">Sınıf</dt>
                <dd>{user.student?.classLevel ?? "—"}</dd>
                <dt className="od-muted">Kayıt</dt>
                <dd>{fmtDate(user.createdAt)}</dd>
              </dl>
            </CardBody>
          </Card>
        </>
      ) : null}

      {tab === "paket" ? (
        <>
          <Card style={{ marginBottom: 16 }}>
            <CardHeader title="Entitlement geçmişi" subtitle={`${user.odkEntitlements.length} kayıt`} />
            <CardBody>
              {user.odkEntitlements.length === 0 ? (
                <EmptyState title="Paket yok" description="Bu kullanıcının hiç ODK entitlement'ı yok." />
              ) : (
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
                    {user.odkEntitlements.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <Link href={`/panel/admin/odk/paketler/${e.package.id}`}>
                            {e.package.title}
                          </Link>
                        </td>
                        <td>
                          <Badge tone={e.status === "ACTIVE" ? "ok" : "neutral"}>{e.status}</Badge>
                        </td>
                        <td className="od-mono">{fmtDate(e.startsAt)}</td>
                        <td className="od-mono">{fmtDate(e.expiresAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Access tag'leri" subtitle={`${user.odkUserAccessTags.length} kayıt`} />
            <CardBody>
              {user.odkUserAccessTags.length === 0 ? (
                <EmptyState title="Tag yok" description="—" />
              ) : (
                <table className="od-table">
                  <thead>
                    <tr>
                      <th>Tag</th>
                      <th>Servis</th>
                      <th>Bitiş</th>
                      <th>Revoke</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.odkUserAccessTags.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <strong>{t.accessTag.title}</strong>{" "}
                          <span className="od-muted od-mono" style={{ fontSize: 11 }}>
                            {t.accessTag.key}
                          </span>
                        </td>
                        <td>
                          <Badge tone={t.accessTag.service === "ODK" ? "purple" : "teal"}>
                            {t.accessTag.service}
                          </Badge>
                        </td>
                        <td className="od-mono">{fmtDate(t.expiresAt)}</td>
                        <td className="od-mono">{fmtDate(t.revokedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </>
      ) : null}

      {tab === "denemeler" ? (
        <Card>
          <CardHeader title="Deneme sonuçları" subtitle={`${user.odkAttempts.length} attempt`} />
          <CardBody>
            {user.odkAttempts.length === 0 ? (
              <EmptyState title="Henüz deneme yok" description="—" />
            ) : (
              <table className="od-table">
                <thead>
                  <tr>
                    <th>Deneme</th>
                    <th>Durum</th>
                    <th>Net</th>
                    <th>D / Y / B</th>
                    <th>Süre</th>
                    <th>Başlangıç</th>
                    <th>Gönderim</th>
                  </tr>
                </thead>
                <tbody>
                  {user.odkAttempts.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <Link href={`/panel/admin/odk/cozumler/${a.id}`}>{a.exam.title}</Link>
                      </td>
                      <td>
                        <Badge
                          tone={
                            a.status === "SUBMITTED"
                              ? "ok"
                              : a.status === "IN_PROGRESS"
                              ? "warn"
                              : "neutral"
                          }
                        >
                          {a.status}
                        </Badge>
                      </td>
                      <td className="od-mono">{a.score?.toString() ?? "—"}</td>
                      <td className="od-mono">
                        {a.correctCount} / {a.wrongCount} / {a.blankCount}
                      </td>
                      <td className="od-mono">{a.durationSeconds ? `${a.durationSeconds}s` : "—"}</td>
                      <td className="od-mono od-muted">{fmtDate(a.startedAt)}</td>
                      <td className="od-mono od-muted">{fmtDate(a.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      ) : null}

      {tab === "kazanim" && outcomeReport ? (
        <>
          {outcomeReport.progress.length > 0 ? (
            <Card>
              <CardHeader title="Akıllı yorumlar" subtitle="Net trendi + ders zayıflıkları" />
              <CardBody>
                <InsightList
                  insights={sortInsights([
                    ...odkTrendInsights({
                      nets: outcomeReport.progress.map((p) => p.net),
                      labels: outcomeReport.progress.map((p) => p.examTitle),
                    }),
                    ...lessonWeaknessInsights(
                      outcomeReport.byLesson.map((l) => ({
                        lesson: l.lesson,
                        total: l.total,
                        correct: l.correct,
                        wrong: l.wrong,
                        blank: l.blank,
                      })),
                    ),
                  ])}
                />
              </CardBody>
            </Card>
          ) : null}
          <div style={{ height: 12 }} />
          <UserOutcomeView report={outcomeReport} />
        </>
      ) : null}

      {tab === "cheat" ? (
        <Card>
          <CardHeader title="Cheat & integrity" subtitle={`Toplam: ${totalCheat} olay`} />
          <CardBody>
            {user.odkAttempts.filter((a) => a.cheatViolationCount > 0).length === 0 ? (
              <EmptyState title="Cheat olayı yok" description="✓ Temiz." />
            ) : (
              <table className="od-table">
                <thead>
                  <tr>
                    <th>Deneme</th>
                    <th>Cheat sayısı</th>
                    <th>Sekme geçişi</th>
                    <th>Suspicious</th>
                  </tr>
                </thead>
                <tbody>
                  {user.odkAttempts
                    .filter((a) => a.cheatViolationCount > 0)
                    .map((a) => (
                      <tr key={a.id}>
                        <td>
                          <Link href={`/panel/admin/odk/cozumler/${a.id}`}>{a.exam.title}</Link>
                        </td>
                        <td>
                          <Badge tone="bad">{a.cheatViolationCount}</Badge>
                        </td>
                        <td className="od-mono">{a.tabSwitchCount}</td>
                        <td className="od-mono">{a.suspiciousScore?.toFixed(2) ?? "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      ) : null}

      {tab === "odemeler" ? (
        <Card>
          <CardHeader title="Sipariş ve ödemeler" subtitle={`${user.odkOrders.length} sipariş`} />
          <CardBody>
            {user.odkOrders.length === 0 ? (
              <EmptyState title="Ödeme yok" description="Bu kullanıcının ODK sipariş kaydı yok." />
            ) : (
              <table className="od-table">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Paket</th>
                    <th>Tutar</th>
                    <th>Durum</th>
                    <th>Son ödeme</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {user.odkOrders.map((o) => {
                    const lastPay = o.payments[o.payments.length - 1];
                    return (
                      <tr key={o.id}>
                        <td className="od-mono od-muted">{fmtDate(o.createdAt)}</td>
                        <td>{o.package.title}</td>
                        <td className="od-mono">{fmtTRY(o.totalCents)}</td>
                        <td>
                          <Badge
                            tone={
                              o.status === "PAID"
                                ? "ok"
                                : o.status === "PENDING"
                                ? "warn"
                                : "neutral"
                            }
                          >
                            {o.status}
                          </Badge>
                        </td>
                        <td className="od-muted" style={{ fontSize: 12 }}>
                          {lastPay ? `${lastPay.provider} · ${lastPay.status}` : "—"}
                        </td>
                        <td>
                          <Link
                            href={`/panel/admin/odk/siparisler/${o.id}`}
                            className="od-btn od-btn-ghost od-btn-sm"
                          >
                            Detay
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      ) : null}

      {tab === "islem" ? (
        <Card>
          <CardHeader title="Muhasebe izleri" subtitle={`${accounting.length} kayıt (service=ODK)`} />
          <CardBody>
            {accounting.length === 0 ? (
              <EmptyState title="İşlem kaydı yok" description="—" />
            ) : (
              <table className="od-table">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Tip</th>
                    <th>Kategori</th>
                    <th>Tutar</th>
                    <th>RefType</th>
                  </tr>
                </thead>
                <tbody>
                  {accounting.map((a) => (
                    <tr key={a.id}>
                      <td className="od-mono od-muted">{fmtDate(a.occurredAt)}</td>
                      <td>
                        <Badge tone={a.type === "INCOME" ? "ok" : "bad"}>{a.type}</Badge>
                      </td>
                      <td>{a.category}</td>
                      <td className="od-mono">{fmtTRY(a.amount)}</td>
                      <td className="od-mono od-muted" style={{ fontSize: 11 }}>
                        {a.refType}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      ) : null}
    </>
  );
}
