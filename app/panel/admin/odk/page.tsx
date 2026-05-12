import type { Metadata } from "next";
import Link from "next/link";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { KpiCard } from "@/components/panel/ui/kpi-card";
import { Badge } from "@/components/panel/ui/badge";
import { EmptyState } from "@/components/panel/ui/empty-state";

export const metadata: Metadata = {
  title: "ODK · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const FAMILY_TONE: Record<string, "accent" | "purple" | "teal" | "neutral"> = {
  TYT: "accent",
  AYT: "purple",
  LGS: "teal",
};

const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: "Yayında",
  DRAFT: "Taslak",
  ARCHIVED: "Arşiv",
};

const STATUS_TONE: Record<string, "ok" | "warn" | "neutral"> = {
  PUBLISHED: "ok",
  DRAFT: "warn",
  ARCHIVED: "neutral",
};

export default async function AdminOdkDashboard() {
  await requireOdkPanel("admin");

  const [
    examTotal,
    examPublished,
    examDraft,
    attemptTotal,
    attemptSubmitted,
    cheatTotal,
    activeStudents,
    netAvg,
    recentAttempts,
    topExams,
  ] = await Promise.all([
    prisma.odkExam.count(),
    prisma.odkExam.count({ where: { status: "PUBLISHED" } }),
    prisma.odkExam.count({ where: { status: "DRAFT" } }),
    prisma.odkExamAttempt.count(),
    prisma.odkExamAttempt.count({ where: { status: "SUBMITTED" } }),
    prisma.odkExamAttempt.aggregate({ _sum: { cheatViolationCount: true } }),
    prisma.odkExamAttempt.findMany({
      where: { status: "SUBMITTED" },
      distinct: ["userId"],
      select: { userId: true },
      take: 1000,
    }),
    prisma.odkExamAttempt.aggregate({
      _avg: { score: true },
      where: { status: "SUBMITTED" },
    }),
    prisma.odkExamAttempt.findMany({
      where: { status: "SUBMITTED" },
      orderBy: { submittedAt: "desc" },
      take: 10,
      select: {
        id: true,
        score: true,
        cheatViolationCount: true,
        submittedAt: true,
        user: { select: { name: true, email: true } },
        exam: { select: { id: true, title: true, cadenceFamily: true } },
      },
    }),
    prisma.odkExamAttempt.groupBy({
      by: ["examId"],
      _count: { _all: true },
      where: { status: "SUBMITTED" },
      orderBy: { _count: { examId: "desc" } },
      take: 5,
    }),
  ]);

  const topExamIds = topExams.map((t) => t.examId);
  const topExamMeta = topExamIds.length
    ? await prisma.odkExam.findMany({
        where: { id: { in: topExamIds } },
        select: { id: true, title: true, cadenceFamily: true, status: true },
      })
    : [];
  const topExamMetaMap = new Map(topExamMeta.map((e) => [e.id, e]));

  const fmtDate = (d: Date | null) =>
    d
      ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(d)
      : "—";

  return (
    <>
      <PageHeader
        title="OnlineDenemeKulübü"
        subtitle="TYT · AYT · LGS dijital deneme platformu — yönetim merkezi"
        right={
          <Link href="/panel/admin/odk/denemeler/yeni" className="od-btn od-btn-primary">
            Yeni deneme
          </Link>
        }
      />

      <div className="od-kpi-grid">
        <KpiCard label="Toplam Deneme" value={examTotal} meta={`${examPublished} yayında · ${examDraft} taslak`} />
        <KpiCard label="Çözülen Deneme" value={attemptSubmitted} meta={`Toplam ${attemptTotal} oturum`} />
        <KpiCard label="Aktif Öğrenci" value={activeStudents.length} meta="Son 1000 oturuma göre" />
        <KpiCard
          label="Ortalama Net"
          value={netAvg._avg.score ? Number(netAvg._avg.score).toFixed(2) : "—"}
          meta="Submit edilenler"
        />
        <KpiCard
          label="Cheat İhlali"
          value={cheatTotal._sum.cheatViolationCount ?? 0}
          meta="Toplam tüm denemeler"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <Card>
          <CardHeader title="Son çözümler" subtitle="En son submit edilen 10 oturum" />
          <CardBody>
            {recentAttempts.length === 0 ? (
              <EmptyState title="Henüz çözüm yok" />
            ) : (
              <table className="od-table">
                <thead>
                  <tr>
                    <th>Öğrenci</th>
                    <th>Deneme</th>
                    <th>Net</th>
                    <th>Cheat</th>
                    <th>Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAttempts.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <strong style={{ fontSize: 12 }}>{a.user.name ?? "—"}</strong>
                        <div className="od-muted" style={{ fontSize: 11 }}>{a.user.email}</div>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        <Badge tone={FAMILY_TONE[a.exam.cadenceFamily] ?? "neutral"}>
                          {a.exam.cadenceFamily}
                        </Badge>{" "}
                        {a.exam.title}
                      </td>
                      <td className="od-mono">{a.score ? Number(a.score).toFixed(2) : "—"}</td>
                      <td>
                        {a.cheatViolationCount > 0 ? (
                          <Badge tone={a.cheatViolationCount >= 5 ? "bad" : "warn"}>
                            ⚠ {a.cheatViolationCount}
                          </Badge>
                        ) : (
                          <span className="od-muted">—</span>
                        )}
                      </td>
                      <td className="od-muted" style={{ fontSize: 11 }}>{fmtDate(a.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="En çok çözülen denemeler" subtitle="Top 5" />
          <CardBody>
            {topExams.length === 0 ? (
              <EmptyState title="Henüz çözüm yok" />
            ) : (
              <table className="od-table">
                <thead>
                  <tr>
                    <th>Deneme</th>
                    <th>Tür</th>
                    <th>Durum</th>
                    <th>Çözüm</th>
                  </tr>
                </thead>
                <tbody>
                  {topExams.map((t) => {
                    const meta = topExamMetaMap.get(t.examId);
                    if (!meta) return null;
                    return (
                      <tr key={t.examId}>
                        <td>
                          <Link href={`/panel/admin/odk/denemeler/${t.examId}`} style={{ fontWeight: 600 }}>
                            {meta.title}
                          </Link>
                        </td>
                        <td>
                          <Badge tone={FAMILY_TONE[meta.cadenceFamily] ?? "neutral"}>
                            {meta.cadenceFamily}
                          </Badge>
                        </td>
                        <td>
                          <Badge tone={STATUS_TONE[meta.status] ?? "neutral"}>
                            {STATUS_LABEL[meta.status]}
                          </Badge>
                        </td>
                        <td className="od-mono">{t._count._all}</td>
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
          <CardHeader title="Hızlı erişim" subtitle="ODK yönetim modülleri" />
          <CardBody>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <Link href="/panel/admin/odk/denemeler" className="od-card od-card-padded" style={{ textDecoration: "none" }}>
                <strong>Denemeler</strong>
                <div className="od-muted" style={{ fontSize: 12 }}>PDF + JSON yükle, yayınla</div>
              </Link>
              <Link href="/panel/admin/odk/paketler" className="od-card od-card-padded" style={{ textDecoration: "none" }}>
                <strong>ODK Paketleri</strong>
                <div className="od-muted" style={{ fontSize: 12 }}>Satışa açılan paketler</div>
              </Link>
              <Link href="/panel/admin/odk/erisim" className="od-card od-card-padded" style={{ textDecoration: "none" }}>
                <strong>Erişim Tagları</strong>
                <div className="od-muted" style={{ fontSize: 12 }}>OD / ODK kullanıcı atamaları</div>
              </Link>
              <Link href="/panel/admin/odk/cheat" className="od-card od-card-padded" style={{ textDecoration: "none" }}>
                <strong>Cheat Logları</strong>
                <div className="od-muted" style={{ fontSize: 12 }}>İhlal raporları</div>
              </Link>
              <Link href="/panel/admin/odk/kazanim" className="od-card od-card-padded" style={{ textDecoration: "none" }}>
                <strong>Kazanım Analizi</strong>
                <div className="od-muted" style={{ fontSize: 12 }}>Sistem geneli kazanım perf.</div>
              </Link>
              <Link href="/panel/admin/odk/raporlar" className="od-card od-card-padded" style={{ textDecoration: "none" }}>
                <strong>Raporlar</strong>
                <div className="od-muted" style={{ fontSize: 12 }}>Deneme bazlı genel rapor</div>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
