import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { requireProductRole } from "@/lib/auth/guards";
import { getReleasedStudentResult } from "@/lib/odk/student-exam-server";
import { getAccessibleProducts } from "@/lib/auth/products";
import { buildResultNextStepRecommendations } from "@/lib/odk/result-next-step";
import { buildOutcomeDeterministicReason } from "@/lib/panel/dino-explanations";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { prisma } from "@/lib/prisma";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  EmptyState,
  PageHeader,
  PanelProgress,
  PanelTable,
  PanelTableCell,
  PanelTableRow,
  Section,
  PropertyList,
  PropertyRow,
  Sparkline,
  StatusBadge,
  UrlDrawer,
  ViewTabs,
  buttonClass,
} from "@/components/panel/ui";
import { AYT_TRACK_LABEL, aytTrackSections } from "@/lib/odk/student-exam-state";
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

function recommendationActionKind(
  href: string,
): "OPEN_PLAN" | "OPEN_REVIEW" | "OPEN_OD_RECOVERY" | "OPEN_ANSWER_KEY" {
  if (href === "/panel/ogrenci/plan") return "OPEN_PLAN";
  if (href.startsWith("/panel/ogrenci/tekrar")) return "OPEN_REVIEW";
  if (href.startsWith("/panel/ogrenci/telafi")) return "OPEN_OD_RECOVERY";
  return "OPEN_ANSWER_KEY";
}

type SectionRow = { code?: string; title?: string; net?: number; correct?: number; wrong?: number; blank?: number };

const NET = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const DAY = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return "—";
  const minutes = Math.round(ms / 60000);
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours} sa ${minutes % 60} dk` : `${minutes} dk`;
}

export default async function OdkStudentResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ alan?: string | string[]; soru?: string | string[]; onizle?: string | string[] }>;
}) {
  const session = await requireProductRole("ODK", "STUDENT");
  const { id } = await params;
  const data = await getReleasedStudentResult(id, session.userId);
  if (!data) notFound();
  const {
    exam,
    score,
    answerKeyAvailable,
    weakOutcomeSignals,
    timeAnalysis,
    comparison,
    coachSuggestions,
    sectionBreakdown,
  } = data;
  const products = await getAccessibleProducts(session.userId, session.role);
  const hasOK = products.includes("OK");
  const hasOD = products.includes("OD");
  const student = await prisma.studentProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true, fieldTrack: true },
  });
  const query = await searchParams;
  const weak = weakOutcomeSignals.filter((signal) => signal.needsReview);
  const topSignal = weak[0] || weakOutcomeSignals[0] || null;
  const [latestPlan, relatedReviewItem, relatedRecovery] = await Promise.all([
    hasOK && student
      ? prisma.weeklyPlan.findFirst({
          where: { studentId: student.id },
          orderBy: { weekStart: "desc" },
          select: { status: true },
        })
      : Promise.resolve(null),
    hasOD && student && topSignal
      ? prisma.reviewItem.findFirst({
          where: {
            studentId: student.id,
            outcomeId: topSignal.outcomeId,
            status: "ACTIVE",
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    hasOD && student && topSignal
      ? prisma.recoveryPackage.findFirst({
          where: {
            studentId: student.id,
            status: { in: ["PUBLISHED", "COMPLETED"] },
            lesson: {
              outcomeLinks: { some: { outcomeId: topSignal.outcomeId } },
            },
          },
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
    recoveryHref: relatedRecovery
      ? `/panel/ogrenci/telafi?lessonId=${encodeURIComponent(relatedRecovery.lessonId)}`
      : undefined,
  });
  const reasonCode: "NEEDS_REVIEW" | "NO_SIGNAL" = topSignal?.needsReview ? "NEEDS_REVIEW" : "NO_SIGNAL";
  const evidenceBand = topSignal?.confidence || "NA";
  const ageBand = ageBandFromDate(exam.resultsReleasedAt);
  await recordPanelProductEvent(
    {
      name: "odk_result_viewed",
      properties: {
        product: "ODK",
        actionKind: "VIEW_RESULT",
        reasonCode,
        ageBand,
        evidenceBand,
        role: "STUDENT",
      },
    },
    session.role,
  );
  for (const item of recommendations) {
    if (!item.href || !item.actionLabel) continue;
    await recordPanelProductEvent(
      {
        name: "odk_recovery_action_viewed",
        properties: {
          product: "ODK",
          actionKind: recommendationActionKind(item.href),
          reasonCode,
          ageBand,
          evidenceBand,
          role: "STUDENT",
        },
      },
      session.role,
    );
  }
  // AYT alan görünümü (§11.5): öğrencinin alanı biliniyorsa varsayılan "Benim alanım".
  const familyCode = String(exam.examFamilyRef?.code ?? exam.family ?? "");
  const trackCodes = familyCode.startsWith("AYT") ? aytTrackSections(student?.fieldTrack) : null;
  const trackLabel = trackCodes && student?.fieldTrack ? AYT_TRACK_LABEL[student.fieldTrack.toUpperCase()] : null;
  const trackMode: "benim" | "tumu" = trackCodes && query.alan !== "tumu" ? "benim" : "tumu";
  const inTrack = (code: string | undefined) => trackMode === "tumu" || !trackCodes || (code ? trackCodes.includes(code) : false);
  const sections = (Array.isArray(sectionBreakdown) ? (sectionBreakdown as SectionRow[]) : []).filter((section) => inTrack(section.code));
  const trackNet = trackMode === "benim" ? sections.reduce((sum, section) => sum + Number(section.net ?? 0), 0) : null;

  const markedIds = new Set(data.attempt.answers.map((answer) => answer.questionId));
  const questionFilter = query.soru === "yanlis" || query.soru === "bos" || query.soru === "isaretli" ? query.soru : "tumu";
  const questions = score.questionResults
    .filter((item) => inTrack(item.question.section.code))
    .filter((item) =>
      questionFilter === "yanlis"
        ? item.result === "WRONG"
        : questionFilter === "bos"
          ? item.result === "BLANK"
          : questionFilter === "isaretli"
            ? markedIds.has(item.questionId)
            : true,
    );
  const previewParam = typeof query.onizle === "string" ? query.onizle : "";
  const openQuestion = previewParam.startsWith("soru:")
    ? score.questionResults.find((item) => item.questionId === previewParam.slice(5)) ?? null
    : null;
  const baseHref = `/panel/odk/ogrenci/denemeler/${id}/sonuc`;
  const withQuery = (next: Record<string, string | null>) => {
    const params = new URLSearchParams();
    const merged = { alan: trackCodes ? (trackMode === "tumu" ? "tumu" : null) : null, soru: questionFilter === "tumu" ? null : questionFilter, ...next };
    for (const [key, value] of Object.entries(merged)) if (value) params.set(key, value);
    const qs = params.toString();
    return qs ? `${baseHref}?${qs}` : baseHref;
  };

  const currentIndex = comparison.findIndex((item) => item.examId === id);
  const previous = currentIndex > 0 ? comparison[currentIndex - 1] : null;
  const delta = previous ? Math.round((Number(score.totalNet) - previous.totalNet) * 100) / 100 : null;

  const outcomes = score.outcomeScores.map((item) => ({
    item,
    accuracy: Number(item.accuracyRate),
    signal: weakOutcomeSignals.find((entry) => entry.outcomeId === item.outcomeId) || null,
  }));
  const strong = outcomes.filter((row) => row.accuracy >= 70 && !row.signal?.needsReview).sort((a, b) => b.accuracy - a.accuracy);
  const improve = outcomes.filter((row) => !(row.accuracy >= 70 && !row.signal?.needsReview));
  const slowest = [...timeAnalysis.sections]
    .filter((section) => inTrack(section.sectionCode))
    .sort((a, b) => b.totalActiveMs - a.totalActiveMs)[0];

  const trackEvent = (href: string) => ({
    name: "odk_recovery_action_started" as const,
    properties: {
      product: "ODK" as const,
      actionKind: recommendationActionKind(href),
      reasonCode,
      ageBand,
      evidenceBand,
      role: "STUDENT" as const,
    },
  });

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK" pageTitle="Deneme sonucu">
      <div className="max-w-[1000px]">
        <Link href={`/panel/odk/ogrenci/denemeler/${id}`} className="mb-2 inline-flex items-center gap-1.5 text-[13px] text-pn-text-muted hover:text-pn-text">
          <ArrowLeft size={14} aria-hidden="true" /> Denemeye dön
        </Link>
        <PageHeader
          eyebrow={`${familyCode || "Deneme Ligi"} · ${exam.title}`}
          title="Deneme Sonucun"
          description={`${exam.resultsReleasedAt ? `${DAY.format(exam.resultsReleasedAt)} · ` : ""}Sonucun yalnız kendi cevapların ve denemenin kilitli cevap anahtarı kullanılarak hesaplandı.`}
        />

        <section aria-label="Sonuç özeti" className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-3 border-y border-pn-border py-4">
          <div>
            <p className="text-[12.5px] text-pn-text-muted">Net</p>
            <p className="font-mono text-[32px] font-semibold leading-none tabular-nums text-pn-text">{NET.format(Number(score.totalNet))}</p>
          </div>
          {[
            ["Doğru", String(score.correctCount)],
            ["Yanlış", String(score.wrongCount)],
            ["Boş", String(score.blankCount)],
            ["Süre", formatDuration(score.activeDurationMs)],
            ...(delta !== null ? [["Önceki denemeye göre", `${delta >= 0 ? "+" : "−"}${NET.format(Math.abs(delta))}`]] : []),
            ...(trackNet !== null && trackLabel ? [[`${trackLabel} ham neti`, NET.format(trackNet)]] : []),
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[12.5px] text-pn-text-muted">{label}</p>
              <p className="text-[17px] font-semibold tabular-nums text-pn-text">{value}</p>
            </div>
          ))}
        </section>

        {trackCodes ? (
          <div className="mt-5">
            <ViewTabs
              label="AYT görünümü"
              activeId={trackMode}
              tabs={[
                { id: "benim", label: `Benim alanım${trackLabel ? ` (${trackLabel})` : ""}`, href: withQuery({ alan: null }) },
                { id: "tumu", label: "Tüm bölümler", href: withQuery({ alan: "tumu" }) },
              ]}
            />
            <p className="mt-2 text-[12.5px] text-pn-text-muted">Ham net gösterilir; puan tahmini değildir.</p>
          </div>
        ) : null}

        {sections.length ? (
          <Section id="dersler" title="Dersler" divider={!trackCodes}>
            <PanelTable caption="Ders bazlı sonuç" columns={["Ders", "D", "Y", "B", "Net"]}>
              {sections.map((section, index) => (
                <PanelTableRow key={section.code || index}>
                  <PanelTableCell>{section.title || section.code || `Bölüm ${index + 1}`}</PanelTableCell>
                  <PanelTableCell><span className="tabular-nums">{section.correct ?? "—"}</span></PanelTableCell>
                  <PanelTableCell><span className="tabular-nums">{section.wrong ?? "—"}</span></PanelTableCell>
                  <PanelTableCell><span className="tabular-nums">{section.blank ?? "—"}</span></PanelTableCell>
                  <PanelTableCell>
                    <span className="font-mono font-semibold tabular-nums">{section.net == null ? "—" : NET.format(Number(section.net))}</span>
                  </PanelTableCell>
                </PanelTableRow>
              ))}
            </PanelTable>
          </Section>
        ) : null}

        <Section id="analiz" title="Analiz" description={`${weak.length} gelişim alanı · kazanım doğruluğu ve kanıt sayısı`}>
          <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
            {[
              { title: "Güçlü alanlar", rows: strong, empty: "Bu denemede belirgin güçlü kazanım yok." },
              { title: "Geliştirilecek alanlar", rows: improve, empty: "Geliştirilecek kazanım görünmüyor." },
            ].map((column) => (
              <div key={column.title}>
                <h3 className="text-[13.5px] font-semibold text-pn-text">{column.title}</h3>
                {column.rows.length ? (
                  <ul className="mt-2 border-t border-pn-border">
                    {column.rows.map(({ item, accuracy, signal }) => {
                      const avgSec = item.activeDurationMs ? Math.round(item.activeDurationMs / Math.max(1, item.questionCount) / 1000) : null;
                      return (
                        <li key={item.outcome.code} className="border-b border-pn-border py-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <p className="min-w-0 text-[13.5px] text-pn-text">
                              <span className="mr-1.5 font-mono text-[12px] text-pn-text-muted">{item.outcome.code}</span>
                              {item.outcome.title}
                            </p>
                            <StatusBadge label={`%${accuracy.toFixed(0)}`} tone={accuracy >= 75 ? "success" : accuracy >= 50 ? "warning" : "critical"} />
                          </div>
                          <PanelProgress className="mt-1.5" label={`${item.outcome.code} doğruluk oranı`} value={accuracy} />
                          <p className="mt-1 text-[12px] text-pn-text-muted">
                            {item.outcome.unit.name} · {item.questionCount} soru · {item.correctCount} D, {item.wrongCount} Y, {item.blankCount} B
                            {avgSec != null ? ` · ort. ${avgSec} sn/soru` : ""}
                            {signal ? ` · ${signal.evidenceCount} ölçüm${signal.confidence === "LOW" ? " · az kanıt" : ""}` : ""}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 text-[13px] text-pn-text-muted">{column.empty}</p>
                )}
              </div>
            ))}
          </div>
        </Section>

        <Section id="zaman" title="Zaman analizi" description={slowest ? `En çok süre: ${slowest.sectionTitle} (${Math.round(slowest.totalActiveMs / 60000)} dk).` : undefined}>
          {timeAnalysis.sections.filter((section) => inTrack(section.sectionCode)).length ? (
            <PanelTable caption="Zaman analizi" columns={["Bölüm", "Toplam", "Doğru ort.", "Yanlış ort."]}>
              {timeAnalysis.sections
                .filter((section) => inTrack(section.sectionCode))
                .map((section) => (
                  <PanelTableRow key={section.sectionCode}>
                    <PanelTableCell>{section.sectionTitle}</PanelTableCell>
                    <PanelTableCell>{Math.round(section.totalActiveMs / 60000)} dk</PanelTableCell>
                    <PanelTableCell>{section.correctAvgMs == null ? "—" : `${Math.round(section.correctAvgMs / 1000)} sn`}</PanelTableCell>
                    <PanelTableCell>{section.wrongAvgMs == null ? "—" : `${Math.round(section.wrongAvgMs / 1000)} sn`}</PanelTableCell>
                  </PanelTableRow>
                ))}
            </PanelTable>
          ) : (
            <p className="text-[14px] text-pn-text-muted">Süre verisi yok.</p>
          )}
          {timeAnalysis.fastWrongs.length ? (
            <p className="mt-3 text-[13px] text-pn-text-muted">
              Hızlı yanlış: {timeAnalysis.fastWrongs.length} soru · Uzun süreli yanlış: {timeAnalysis.longWrongs.length} soru
            </p>
          ) : null}
        </Section>

        <Section
          id="sorular"
          title="Soru cevap dökümü"
          actions={
            answerKeyAvailable && exam.currentVersion?.files.length ? (
              <a href={`/api/odk/student/exams/${id}/answer-key`} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
                <FileText size={14} aria-hidden="true" /> Cevap anahtarı PDF
              </a>
            ) : undefined
          }
        >
          <ViewTabs
            label="Soru filtresi"
            activeId={questionFilter}
            tabs={[
              { id: "tumu", label: "Tümü", href: withQuery({ soru: null }) },
              { id: "yanlis", label: "Yanlış", href: withQuery({ soru: "yanlis" }), count: score.questionResults.filter((q) => q.result === "WRONG" && inTrack(q.question.section.code)).length },
              { id: "bos", label: "Boş", href: withQuery({ soru: "bos" }), count: score.questionResults.filter((q) => q.result === "BLANK" && inTrack(q.question.section.code)).length },
              { id: "isaretli", label: "İşaretlediğim", href: withQuery({ soru: "isaretli" }), count: score.questionResults.filter((q) => markedIds.has(q.questionId) && inTrack(q.question.section.code)).length },
            ]}
          />
          {questions.length ? (
            <PanelTable caption="Soru cevap dökümü" columns={["No", "Ders", "Kazanım", "Cevabın", "Doğru", "Süre", ""]}>
              {questions.map((item) => {
                const ms = data.attempt.timings.find((timing) => timing.questionId === item.questionId)?.activeDurationMs;
                return (
                  <PanelTableRow key={item.questionId}>
                    <PanelTableCell><span className="tabular-nums">{item.question.questionNumber}</span></PanelTableCell>
                    <PanelTableCell>{item.question.section.title}</PanelTableCell>
                    <PanelTableCell>{item.question.outcomes.map((outcome) => outcome.outcome.code).join(", ") || "—"}</PanelTableCell>
                    <PanelTableCell>
                      <span className={item.result === "CORRECT" ? "text-(--pn-tone-success)" : item.result === "WRONG" ? "text-(--pn-tone-critical)" : "text-pn-text-muted"}>
                        {item.selectedOption || "Boş"}
                        <span className="sr-only">{item.result === "CORRECT" ? " (doğru)" : item.result === "WRONG" ? " (yanlış)" : ""}</span>
                      </span>
                    </PanelTableCell>
                    <PanelTableCell>{item.correctOption}</PanelTableCell>
                    <PanelTableCell>{ms != null ? `${Math.round(ms / 1000)} sn` : "—"}</PanelTableCell>
                    <PanelTableCell>
                      <Link
                        href={`${withQuery({})}${withQuery({}).includes("?") ? "&" : "?"}onizle=soru:${item.questionId}`}
                        scroll={false}
                        aria-haspopup="dialog"
                        className={buttonClass("ghost", "sm")}
                      >
                        Ayrıntı<span className="sr-only"> · Soru {item.question.questionNumber}</span>
                      </Link>
                      {markedIds.has(item.questionId) ? <span className="sr-only"> (işaretlediğin soru)</span> : null}
                    </PanelTableCell>
                  </PanelTableRow>
                );
              })}
            </PanelTable>
          ) : (
            <p className="mt-3 text-[14px] text-pn-text-muted">Bu filtrede soru yok.</p>
          )}
        </Section>

        {comparison.length > 1 ? (
          <Section id="trend" title={`${familyCode} net gelişimi`} description="Yalnız kendi açıklanan denemelerinle.">
            <div className="flex flex-wrap items-center gap-5">
              <Sparkline values={comparison.map((item) => item.totalNet)} label={`Toplam net: ${comparison.map((item) => `${item.title} ${NET.format(item.totalNet)}`).join(", ")}`} />
              <ul className="min-w-[240px] flex-1 border-t border-pn-border">
                {comparison.map((item) => (
                  <li key={item.examId} className="flex justify-between gap-3 border-b border-pn-border py-1.5 text-[13.5px]">
                    <span className={item.examId === id ? "font-semibold text-pn-text" : "text-pn-text-secondary"}>
                      {item.title}
                      {item.examId === id ? <span className="sr-only"> (bu deneme)</span> : null}
                    </span>
                    <span className="font-mono tabular-nums">{NET.format(item.totalNet)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Section>
        ) : null}

        <Section id="sonraki-adim" title="Sonraki adım">
          {recommendations.length || (hasOK && coachSuggestions.length) ? (
            <ul className="border-t border-pn-border">
              {hasOK
                ? coachSuggestions.map((item) => (
                    <li key={item.outcomeCode} className="flex flex-wrap items-center gap-3 border-b border-pn-border py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium text-pn-text">Koçundan plan önerisi · {item.subject} → {item.topic}</p>
                        <p className="text-[13px] text-pn-text-secondary">{item.label}</p>
                      </div>
                      <TrackedPanelLink href="/panel/ogrenci/plan" className={buttonClass("secondary", "sm")} event={trackEvent("/panel/ogrenci/plan")}>
                        Haftalık plana ekle
                      </TrackedPanelLink>
                    </li>
                  ))
                : null}
              {recommendations.map((item, index) => (
                <li key={`${item.title}-${index}`} className="flex flex-wrap items-center gap-3 border-b border-pn-border py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-pn-text">{item.title}</p>
                    <p className="text-[13px] text-pn-text-secondary">{item.detail}</p>
                  </div>
                  {item.href && item.actionLabel ? (
                    <TrackedPanelLink
                      href={item.href}
                      className={buttonClass(item.tone === "primary" ? "primary" : "secondary", "sm")}
                      event={trackEvent(item.href)}
                    >
                      {item.actionLabel}
                    </TrackedPanelLink>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Şu an net bir çalışma önerisi üretilemedi."
              body="Yeni ölçümle sinyal netleştiğinde bir sonraki adım burada görünür."
            />
          )}
          {topSignal ? (
            <div className="mt-4">
              <DinoExplanationAction
                deterministicReason={buildOutcomeDeterministicReason(topSignal)}
                questionKey="student_odk_reason"
                openLabel="Bu denemeyi açıkla"
                prepareLabel="Dino ile denemeyi açıkla"
              />
            </div>
          ) : null}
        </Section>
      </div>

      {openQuestion ? (
        <UrlDrawer
          title={`Soru ${openQuestion.question.questionNumber}`}
          description={openQuestion.question.section.title}
        >
          <PropertyList>
            <PropertyRow label="Sonuç">
              <StatusBadge
                label={openQuestion.result === "CORRECT" ? "Doğru" : openQuestion.result === "WRONG" ? "Yanlış" : "Boş"}
                tone={openQuestion.result === "CORRECT" ? "success" : openQuestion.result === "WRONG" ? "critical" : "neutral"}
              />
              {markedIds.has(openQuestion.questionId) ? (
                <span className="ml-2 inline-block align-middle">
                  <StatusBadge label="İşaretlemiştin" tone="warning" />
                </span>
              ) : null}
            </PropertyRow>
            <PropertyRow label="Cevabın">{openQuestion.selectedOption || "Boş bıraktın"}</PropertyRow>
            <PropertyRow label="Doğru cevap">{openQuestion.correctOption}</PropertyRow>
            <PropertyRow label="Süre">
              {(() => {
                const ms = data.attempt.timings.find((timing) => timing.questionId === openQuestion.questionId)?.activeDurationMs;
                return ms != null ? `${Math.round(ms / 1000)} sn` : "Süre kaydı yok";
              })()}
            </PropertyRow>
          </PropertyList>
          {openQuestion.question.outcomes.length ? (
            <div className="mt-5">
              <h3 className="text-[13.5px] font-semibold text-pn-text">Kazanım</h3>
              <ul className="mt-2 border-t border-pn-border">
                {openQuestion.question.outcomes.map((link) => {
                  const outcomeScore = score.outcomeScores.find((row) => row.outcome.code === link.outcome.code);
                  return (
                    <li key={link.outcome.code} className="border-b border-pn-border py-2.5">
                      <p className="text-[13.5px] text-pn-text">
                        <span className="mr-1.5 font-mono text-[12px] text-pn-text-muted">{link.outcome.code}</span>
                        {link.outcome.title}
                        {link.isPrimary ? <span className="ml-1.5 text-[12px] text-pn-text-muted">· ana kazanım</span> : null}
                      </p>
                      {outcomeScore ? (
                        <p className="mt-0.5 text-[12.5px] text-pn-text-muted">
                          Bu denemede bu kazanımda %{Number(outcomeScore.accuracyRate).toFixed(0)} doğruluk · {outcomeScore.questionCount} soru
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          <p className="mt-5 text-[13px] text-pn-text-secondary">
            Sorunun kendisi deneme kitapçığındadır
            {answerKeyAvailable && exam.currentVersion?.files.length ? "; çözüm için cevap anahtarını açabilirsin." : "."}
          </p>
          {answerKeyAvailable && exam.currentVersion?.files.length ? (
            <a href={`/api/odk/student/exams/${id}/answer-key`} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm", "mt-2")}>
              <FileText size={14} aria-hidden="true" /> Cevap anahtarını aç
            </a>
          ) : null}
        </UrlDrawer>
      ) : null}
    </PanelShell>
  );
}
