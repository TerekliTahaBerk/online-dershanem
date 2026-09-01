import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileText, Target, XCircle } from "lucide-react";
import { requireProductRole } from "@/lib/auth/guards";
import { getReleasedStudentResult } from "@/lib/odk/student-exam-server";
import { getAccessibleProducts } from "@/lib/auth/products";
import { buildResultNextStepRecommendations } from "@/lib/odk/result-next-step";
import { buildOutcomeDeterministicReason } from "@/lib/panel/dino-explanations";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { prisma } from "@/lib/prisma";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelPageHeader, PanelMetric, PanelCard, PanelProgress, PanelStatusBadge, PanelAttentionCard, PanelEmpty } from "@/components/panel/ui";
import { DinoExplanationAction } from "@/components/panel/dino-explanation-action";
import { TrackedPanelLink } from "@/components/panel/tracked-panel-link";

export const dynamic = "force-dynamic";

function ageBandFromDate(value: Date | null): "0-2D" | "3-7D" | "8D+" | "NA" {
  if (!value) return "NA";
  const diffDays = (Date.now() - value.getTime()) / 86400000;
  if (diffDays <= 2) return "0-2D";
  if (diffDays <= 7) return "3-7D";
  return "8D+";
}

function recommendationActionKind(href: string): "OPEN_PLAN" | "OPEN_REVIEW" | "OPEN_OD_RECOVERY" | "OPEN_ANSWER_KEY" {
  if (href === "/panel/ogrenci/plan") return "OPEN_PLAN";
  if (href.startsWith("/panel/ogrenci/tekrar")) return "OPEN_REVIEW";
  if (href.startsWith("/panel/ogrenci/telafi")) return "OPEN_OD_RECOVERY";
  return "OPEN_ANSWER_KEY";
}

export default async function OdkStudentResultPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireProductRole("ODK", "STUDENT"); const { id } = await params;
  const data = await getReleasedStudentResult(id, session.userId); if (!data) notFound();
  const { exam, score, answerKeyAvailable, weakOutcomeSignals } = data;
  const products = await getAccessibleProducts(session.userId, session.role);
  const hasOK = products.includes("OK");
  const hasOD = products.includes("OD");
  const student = await prisma.studentProfile.findUnique({ where: { userId: session.userId }, select: { id: true } });
  const weak = weakOutcomeSignals.filter((signal) => signal.needsReview);
  const topSignal = weak[0] || weakOutcomeSignals[0] || null;
  const [latestPlan, relatedReviewItem, relatedRecovery] = await Promise.all([
    hasOK && student
      ? prisma.weeklyPlan.findFirst({ where: { studentId: student.id }, orderBy: { weekStart: "desc" }, select: { status: true } })
      : Promise.resolve(null),
    hasOD && student && topSignal
      ? prisma.reviewItem.findFirst({ where: { studentId: student.id, outcomeId: topSignal.outcomeId, status: "ACTIVE" }, select: { id: true } })
      : Promise.resolve(null),
    hasOD && student && topSignal
      ? prisma.recoveryPackage.findFirst({
          where: { studentId: student.id, status: { in: ["PUBLISHED", "COMPLETED"] }, lesson: { outcomeLinks: { some: { outcomeId: topSignal.outcomeId } } } },
          orderBy: { dueAt: "asc" },
          select: { lessonId: true },
        })
      : Promise.resolve(null),
  ]);
  const recommendations = buildResultNextStepRecommendations({
    weakOutcomeSignals,
    hasOK,
    hasOD,
    hasPlan: Boolean(latestPlan),
    answerKeyAvailable,
    answerKeyHref: `/api/odk/student/exams/${id}/answer-key`,
    reviewHref: relatedReviewItem ? "/panel/ogrenci/tekrar" : undefined,
    recoveryHref: relatedRecovery ? `/panel/ogrenci/telafi?lessonId=${encodeURIComponent(relatedRecovery.lessonId)}` : undefined,
  });
  const reasonCode = topSignal?.needsReview ? "NEEDS_REVIEW" : "NO_SIGNAL";
  const evidenceBand = topSignal?.confidence || "NA";
  const ageBand = ageBandFromDate(exam.resultsReleasedAt);
  await recordPanelProductEvent({
    name: "odk_result_viewed",
    properties: { product: "ODK", actionKind: "VIEW_RESULT", reasonCode, ageBand, evidenceBand, role: "STUDENT" },
  }, session.role);
  for (const item of recommendations) {
    if (!item.href || !item.actionLabel) continue;
    await recordPanelProductEvent({
      name: "odk_recovery_action_viewed",
      properties: {
        product: "ODK",
        actionKind: recommendationActionKind(item.href),
        reasonCode,
        ageBand,
        evidenceBand,
        role: "STUDENT",
      },
    }, session.role);
  }
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK">
    <Link href={`/panel/odk/ogrenci/denemeler/${id}`} className="inline-flex items-center gap-2 text-sm font-bold text-dc-ink-body"><ArrowLeft size={15} /> Denemeye dön</Link>
    <div className="mt-6">
      <PanelPageHeader eyebrow={exam.title} title="Deneme Sonucun" description="Sonucun yalnız kendi cevapların ve denemenin kilitli cevap anahtarı kullanılarak hesaplandı." />
    </div>
    <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Net", Number(score.totalNet).toFixed(2), Target, "info"], ["Doğru", score.correctCount, CheckCircle2, "success"], ["Yanlış", score.wrongCount, XCircle, "critical"], ["Boş", score.blankCount, FileText, "neutral"]].map(([label, value, Icon, tone]) => { const MetricIcon = Icon as typeof Target; return <PanelMetric key={String(label)} label={String(label)} value={String(value)} icon={MetricIcon} tone={tone as "neutral" | "info" | "success" | "critical"} />; })}</section>
    <section className="mt-6 grid gap-6 xl:grid-cols-2"><PanelCard className="p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-extrabold text-dc-ink">Kazanım görünümü</h2><span className="text-xs font-bold text-dc-ink-muted">{weak.length} gelişim alanı</span></div><div className="mt-4 space-y-3">{score.outcomeScores.map((item) => { const accuracy = Number(item.accuracyRate); const signal = weakOutcomeSignals.find((entry) => entry.outcomeId === item.outcomeId) || null; return <article key={item.outcome.code} className="rounded-2xl border border-dc-line p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black text-dc-brand-strong">{item.outcome.code}</p><h3 className="mt-1 text-sm font-bold text-dc-ink">{item.outcome.title}</h3><p className="mt-1 text-xs text-dc-ink-muted">{item.outcome.unit.name} · {item.correctCount} doğru, {item.wrongCount} yanlış, {item.blankCount} boş</p>{signal ? <p className="mt-1 text-[11px] text-dc-ink-muted">{signal.evidenceCount} ölçüm · {signal.questionCount} soru kanıtı{signal.confidence === "LOW" ? " · Az kanıt" : ""}</p> : null}</div><PanelStatusBadge label={`%${accuracy.toFixed(0)}`} tone={accuracy >= 75 ? "success" : accuracy >= 50 ? "warning" : "critical"} /></div><PanelProgress className="mt-3" label={`${item.outcome.code} doğruluk oranı`} value={accuracy} /></article>; })}</div></PanelCard>
    <PanelCard className="p-5"><h2 className="font-extrabold text-dc-ink">Bu sonuçtan sonraki adım</h2><div className="mt-4 space-y-3">{recommendations.map((item, index) => item.tone === "primary" ? <PanelAttentionCard key={`${item.title}-${index}`} tone="info" title={item.title} body={item.detail} action={item.href && item.actionLabel ? <TrackedPanelLink href={item.href} className="panel-quick-action panel-quick-action-primary" event={{ name: "odk_recovery_action_started", properties: { product: "ODK", actionKind: recommendationActionKind(item.href), reasonCode, ageBand, evidenceBand, role: "STUDENT" } }}>{item.actionLabel}</TrackedPanelLink> : null} /> : <PanelCard key={`${item.title}-${index}`} className="border-dc-line-soft p-4"><h3 className="text-sm font-bold text-dc-ink">{item.title}</h3><p className="mt-1 text-xs text-dc-ink-muted">{item.detail}</p>{item.href && item.actionLabel ? <TrackedPanelLink href={item.href} className="panel-quick-action mt-3" event={{ name: "odk_recovery_action_started", properties: { product: "ODK", actionKind: recommendationActionKind(item.href), reasonCode, ageBand, evidenceBand, role: "STUDENT" } }}>{item.actionLabel}</TrackedPanelLink> : null}</PanelCard>)}{!recommendations.length ? <PanelEmpty className="mt-0 border-dashed p-5" title="Şu an net bir çalışma önerisi üretilemedi." body="Yeni ölçümle sinyal netleştiğinde bir sonraki adım burada görünür." /> : null}</div>{topSignal ? <DinoExplanationAction deterministicReason={buildOutcomeDeterministicReason(topSignal)} questionKey="student_odk_reason" openLabel="Bu denemeyi açıkla" prepareLabel="Dino ile denemeyi açıkla" /> : null}</PanelCard></section>
    <PanelCard className="mt-6 p-5"><h2 className="font-extrabold text-dc-ink">Soru cevap dökümü</h2><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{score.questionResults.map((item) => <div key={item.question.questionNumber} className={`rounded-xl p-3 text-xs font-bold ${item.result === "CORRECT" ? "bg-[var(--pd-pastel-mint-soft)] text-[var(--pd-pastel-mint-ink)]" : item.result === "WRONG" ? "bg-[var(--pd-pastel-blush-soft)] text-[var(--pd-pastel-blush-ink)]" : "bg-slate-100 text-slate-700"}`}><p>Soru {item.question.questionNumber}</p><p className="mt-1">Sen: {item.selectedOption || "—"} · Doğru: {item.correctOption}</p></div>)}</div>{answerKeyAvailable && exam.currentVersion?.files.length ? <a href={`/api/odk/student/exams/${id}/answer-key`} target="_blank" rel="noreferrer" className="panel-quick-action panel-quick-action-primary mt-5 inline-flex"><FileText size={15} /> Cevap anahtarı PDF</a> : null}</PanelCard>
  </PanelShell>;
}
