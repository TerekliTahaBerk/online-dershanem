import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import {
  canStudentViewOdkAttempt,
  getStudentOdkResultDetail,
  getStudentOdkAttempts,
  getStudentOdkSectionBreakdown,
  getStudentOdkWeakSignals,
} from "@/lib/panel/odk-student";
import type { OdkSectionScore } from "@/lib/panel/odk-student";
import { OdkResultSummaryCard } from "@/components/panel/odk/student/odk-result-summary-card";
import { OdkSectionBreakdown } from "@/components/panel/odk/student/odk-section-breakdown";
import { OdkResultRecommendations } from "@/components/panel/odk/student/odk-result-recommendations";
import { OdkQuestionStatusList } from "@/components/panel/odk/student/odk-question-status-list";

export const metadata: Metadata = {
  title: "Deneme Sonucu · ODK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StudentOdkResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const ctx = await requireOdkPanel("ogrenci");
  const { attemptId } = await params;

  const allowed = await canStudentViewOdkAttempt(
    ctx.userId,
    ctx.actualRole,
    attemptId,
  );
  if (!allowed) notFound();

  const detail = await getStudentOdkResultDetail(attemptId);
  if (!detail) notFound();

  // In-progress = redirect-style empty.
  if (detail.status === "IN_PROGRESS") {
    return (
      <>
        <PageHeader
          title="Deneme henüz tamamlanmadı"
          subtitle="Sonucu görmek için önce çözümü tamamlamalısın."
        />
        <Card>
          <CardBody>
            <Link
              href={`/panel/ogrenci/odk/cozum/${detail.attemptId}`}
              className="od-btn od-btn-primary"
            >
              Çözüme dön
            </Link>
          </CardBody>
        </Card>
      </>
    );
  }

  // Recent attempts for "repeated weakness" signal — own attempts only.
  const recent = await getStudentOdkAttempts(ctx.userId, {
    take: 4,
    onlySubmitted: true,
  });
  const recentOthers = recent.filter((r) => r.id !== detail.attemptId).slice(0, 3);
  const recentSectionMap = new Map<string, OdkSectionScore[]>();
  await Promise.all(
    recentOthers.map(async (r) => {
      const ss = await getStudentOdkSectionBreakdown(r.id);
      recentSectionMap.set(r.id, ss);
    }),
  );

  const signals = getStudentOdkWeakSignals(
    detail,
    recentOthers,
    recentSectionMap,
  );

  return (
    <>
      <PageHeader
        title={detail.examTitle}
        subtitle={`${detail.cadenceFamily} · Sonuç`}
        right={
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Link
              href="/panel/ogrenci/hedefim"
              className="od-btn od-btn-ghost od-btn-sm"
            >
              Yol haritam
            </Link>
            <Link
              href="/panel/ogrenci/calisma-odasi"
              className="od-btn od-btn-ghost od-btn-sm"
            >
              Çalışma başlat
            </Link>
            <Link
              href="/panel/ogrenci/kutuphane"
              className="od-btn od-btn-ghost od-btn-sm"
            >
              Materyaller
            </Link>
            <Link
              href="/panel/ogrenci/odk/denemeler"
              className="od-btn od-btn-ghost od-btn-sm"
            >
              Diğer denemeler
            </Link>
          </div>
        }
      />

      <div style={{ marginBottom: 12 }}>
        <OdkResultSummaryCard detail={detail} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <OdkSectionBreakdown sections={detail.sections} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <OdkResultRecommendations signals={signals} />
      </div>

      {detail.perQuestion.length > 0 ? (
        <div style={{ marginBottom: 12 }}>
          <OdkQuestionStatusList perQuestion={detail.perQuestion} />
        </div>
      ) : null}
    </>
  );
}
