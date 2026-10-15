import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, CircleAlert } from "lucide-react";
import { requireAnyStaffPermission } from "@/lib/auth/guards";
import { ODK_EXAM_LIST_PERMISSIONS } from "@/lib/products/staff-permission-matrix";
import { examStatusPresentation } from "@/lib/odk/presentation";
import {
  EXAM_ANCHOR_TABS,
  opsCounters,
  questionMatchesFilter,
  type QuestionFilter,
} from "@/lib/odk/staff-workspace";
import { PanelShell } from "@/components/panel/panel-shell";
import { AdminExamEditor } from "@/components/odk/admin-exam-editor";
import { AdminJsonImportPanel } from "@/components/odk/admin-json-import-panel";
import { AdminAssignmentPanel } from "@/components/odk/admin-assignment-panel";
import { AdminPreviewPanel } from "@/components/odk/admin-preview-panel";
import { AdminIntegrityReviewPanel } from "@/components/odk/admin-integrity-review-panel";
import { AdminResultsReviewPanel } from "@/components/odk/admin-results-review-panel";
import { AdminSessionPlan } from "@/components/odk/admin-session-plan";
import { AdminAnswerKeyRevisionPanel } from "@/components/odk/admin-answer-key-revision-panel";
import { AdminBookletPanel } from "@/components/odk/admin-booklet-panel";
import { AdminBookletAssignmentPanel } from "@/components/odk/admin-booklet-assignment-panel";
import { bookletOrdersHash, loadBookletSetup } from "@/lib/odk/booklet-server";
import { prisma } from "@/lib/prisma";
import { loadAnswerKeyRevisionPanel } from "@/lib/odk/answer-key-revision-server";
import { AnchorTabRedirect } from "@/components/panel/anchor-tab-redirect";
import {
  EmptyState,
  PageHeader,
  PanelTable,
  PanelTableCell,
  PanelTableRow,
  PropertyList,
  PropertyRow,
  Section,
  StatusBadge,
  ViewTabs,
  buttonClass,
} from "@/components/panel/ui";
import { loadExamHistory } from "../../staff-data";
import { loadOdkExamReport, loadOdkExamWorkspace } from "@/lib/odk/exam-workspace-server";

export const dynamic = "force-dynamic";

const DATE_TIME = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });
const TONE = { neutral: "neutral", info: "info", warning: "warning", success: "success", danger: "critical" } as const;
const QUESTION_FILTERS: Array<{ id: QuestionFilter; label: string }> = [
  { id: "tumu", label: "Tümü" },
  { id: "kazanimsiz", label: "Kazanımsız" },
  { id: "anahtarsiz", label: "Anahtarsız" },
];

function localInput(value: Date | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(value)
    .replace(" ", "T");
}

const formatDate = (value: Date | null | undefined) => (value ? DATE_TIME.format(value) : "—");

/**
 * DENEME ÇALIŞMA ALANI (docs/panel-design-roadmap.md §15.2–15.3). Eski tek
 * sayfa düzenleyici sekmelere bölündü (`?sekme=`); kullanılamayan sekme hiç
 * çizilmez. Her panel kendi iznine göre görünür ve uçlar izni ayrıca
 * doğrular; cevap anahtarı yalnız `odk:exam:edit` taşıyana gönderilir.
 */
export default async function OdkAdminExamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sekme?: string; filtre?: string; bolum?: string }>;
}) {
  const session = await requireAnyStaffPermission(ODK_EXAM_LIST_PERMISSIONS);
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const workspace = await loadOdkExamWorkspace(session.userId, id, query);
  if (!workspace) notFound();
  // Çoklu kitapçık kurulumu: İçerik (sıra, PDF, anahtar) ve Önizleme sekmelerinde gerekir.
  const bookletSetup = workspace.tab === "icerik" || workspace.tab === "onizleme" ? await loadBookletSetup(prisma, id) : null;
  const bookletCodes = bookletSetup?.codes ?? ["A"];
  const { caps, exam, version, issues, familyCode, sessionPlan, tabs, tab, questionFilter, windowEnded, outcomes, attempts, assignedCount, questions, questionsRevision, submittedCount, scoredCount, reviewCount, security, readiness, primary, draftEditable } = workspace;
  const now = new Date();
  const status = examStatusPresentation[exam.status];
  const tabHref = (next: string, extra?: string) => `/panel/odk/yonetim/sinavlar/${exam.id}?sekme=${next}${extra ?? ""}`;
  const showRail = tab === "genel" || tab === "icerik" || tab === "sorular";

  const editorExam = {
    id: exam.id,
    title: exam.title,
    family: familyCode,
    status: exam.status,
    startsAt: localInput(exam.startsAt),
    endsAt: localInput(exam.endsAt),
    lateEntryMinutes: exam.lateEntryMinutes,
    meetRequired: exam.meetRequired,
    meetUrl: exam.meetUrl || "",
    versionStatus: version.status,
    durationMinutes: version.durationMinutes,
    files: version.files.map((file) => ({ id: file.id, type: file.type, fileName: file.fileName, sessionKey: file.sessionKey, bookletCode: file.bookletCode })),
    sessions: sessionPlan?.map((item) => ({ key: item.key, title: item.title })),
    booklets: bookletCodes,
    // Cevap anahtarı yalnız içerik editörüne gider (EXAM_EDITOR / ADMIN).
    questions: caps.edit ? questions : [],
    questionsRevision: caps.edit ? questionsRevision : undefined,
    security: { ...security, autoSubmit: version.autoSubmit },
  };
  const editorCapabilities = { edit: caps.edit, schedule: caps.schedule, score: caps.score, rescore: caps.rescore };
  const resultStats = {
    attemptCount: attempts.length,
    submittedCount,
    scoredCount,
    examEnded: windowEnded,
    integrityReviewCount: reviewCount,
  };
  const editor = (sections: Parameters<typeof AdminExamEditor>[0]["sections"]) => (
    <AdminExamEditor
      capabilities={editorCapabilities}
      exam={editorExam}
      outcomes={outcomes}
      issues={issues}
      resultStats={resultStats}
      sections={sections}
      questionFilter={questionFilter}
      initialSection={typeof query.bolum === "string" ? query.bolum : null}
    />
  );

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK" pageTitle={exam.title}>
      <AnchorTabRedirect anchors={EXAM_ANCHOR_TABS} activeTab={tab} />
      <Link href="/panel/odk/yonetim/sinavlar" className={buttonClass("ghost", "sm", "-ml-2.5")}>
        <ArrowLeft size={14} aria-hidden="true" /> Denemeler
      </Link>
      <PageHeader
        title={exam.title}
        description={`${exam.structureMode === "FULL_TEMPLATE" ? "Tam deneme" : "Matematik"}${exam.series ? ` · ${exam.series.title}` : ""}. Sonuçlar yayınlanmadan öğrenciye açılmaz; canlıdan sonra kritik alanlar kilitlenir.`}
        actions={
          primary ? (
            <Link href={tabHref(primary.tab)} className={buttonClass("primary", "md")}>
              {primary.label}
            </Link>
          ) : undefined
        }
        metadata={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-pn-text-secondary">
            <span className="flex items-center gap-1.5">
              <StatusBadge tone="neutral" label={familyCode} />
              <StatusBadge tone={TONE[status.tone]} label={status.label} live={exam.status === "LIVE"} />
              <span className="text-pn-text-muted">sürüm {version.versionNumber}</span>
            </span>
            <span>
              Başlangıç <strong className="font-medium text-pn-text tabular-nums">{formatDate(exam.startsAt)}</strong>
            </span>
            <span>
              Süre <strong className="font-medium text-pn-text tabular-nums">{version.durationMinutes} dk</strong>
            </span>
            <span>
              Atanan <strong className="font-medium text-pn-text tabular-nums">{assignedCount}</strong>
            </span>
            <span>
              Katılım <strong className="font-medium text-pn-text tabular-nums">{submittedCount}/{attempts.length}</strong>
            </span>
          </div>
        }
      />

      <div className="mt-3">
        <ViewTabs label="Deneme çalışma alanı" activeId={tab} tabs={tabs.map((item) => ({ id: item.id, label: item.label, href: tabHref(item.id) }))} />
      </div>

      <div className={showRail ? "mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]" : "mt-6"}>
        <div className="min-w-0 space-y-6">
          {tab === "genel" ? (
            <>
              <Section title="Yaşam döngüsü" divider={false}>
                <PropertyList>
                  <PropertyRow label="Taslak">{formatDate(exam.createdAt)}</PropertyRow>
                  <PropertyRow label="Sürüm kilidi">{formatDate(exam.contentLockedAt)}</PropertyRow>
                  <PropertyRow label="Planlandı">{formatDate(exam.publishedAt)}</PropertyRow>
                  <PropertyRow label="Pencere">
                    {formatDate(exam.startsAt)} – {formatDate(exam.endsAt)}
                    {exam.lateEntryMinutes ? ` · ${exam.lateEntryMinutes} dk geç giriş` : ""}
                  </PropertyRow>
                  <PropertyRow label="Sonuç yayını">{formatDate(exam.resultsReleasedAt)}</PropertyRow>
                  <PropertyRow label="Meet">{exam.meetRequired ? (exam.meetUrl ? "Zorunlu · bağlantı tanımlı" : "Zorunlu · bağlantı eksik") : "Gerekmiyor"}</PropertyRow>
                </PropertyList>
              </Section>
              <Section title="Katılım">
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Atanan", assignedCount],
                    ["Başlayan", attempts.length],
                    ["Teslim", submittedCount],
                    ["Puanlandı", scoredCount],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-pn-border px-3 py-2.5">
                      <dt className="text-[12.5px] text-pn-text-muted">{label}</dt>
                      <dd className="text-[20px] font-semibold tabular-nums text-pn-text">{value}</dd>
                    </div>
                  ))}
                </dl>
              </Section>
              {issues.length ? (
                <Section title="Hazırlık sorunları" description={caps.edit ? "Her sorun ilgili sekmede düzeltilir." : undefined}>
                  <ul className="space-y-1.5 text-[13.5px]">
                    {issues.slice(0, 12).map((issue, index) => (
                      <li key={`${issue.code}-${index}`} className="flex gap-2">
                        <CircleAlert size={14} aria-hidden="true" className={`mt-0.5 shrink-0 ${issue.level === "error" ? "text-(--pn-tone-critical)" : "text-(--pn-tone-warning)"}`} />
                        <span>
                          {"questionNumber" in issue && issue.questionNumber ? `Soru ${issue.questionNumber}: ` : ""}
                          {issue.message}
                        </span>
                      </li>
                    ))}
                    {issues.length > 12 ? <li className="text-pn-text-muted">+{issues.length - 12} sorun daha</li> : null}
                  </ul>
                </Section>
              ) : null}
            </>
          ) : null}

          {tab === "icerik" ? (
            <>
              {bookletSetup && (caps.edit || (caps.rescore && bookletSetup.codes.length > 1)) ? (
                <AdminBookletPanel
                  examId={exam.id}
                  sections={version.sections.map((section) => ({ code: section.code, title: section.title }))}
                  booklets={bookletSetup.codes.map((code) => ({ code, questionCount: code === "A" ? bookletSetup.questions.length : bookletSetup.orders.filter((row) => row.bookletCode === code).length }))}
                  currentHash={bookletOrdersHash(bookletSetup.orders)}
                  editable={caps.edit && draftEditable}
                  correctable={caps.rescore && !draftEditable && version.status !== "DRAFT" && bookletSetup.codes.length > 1}
                  totalQuestions={bookletSetup.questions.length}
                />
              ) : null}
              <div id="adim-json">{draftEditable || version.status === "DRAFT" ? <AdminJsonImportPanel examId={exam.id} sections={version.sections.map((section) => ({ code: section.code, title: section.title }))} bookletCodes={bookletCodes} /> : null}</div>
              {editor(["files"])}
            </>
          ) : null}

          {tab === "sorular" ? (
            <>
              <nav aria-label="Soru süzgeci" className="flex flex-wrap gap-1.5">
                {QUESTION_FILTERS.map((item) => {
                  const count = questions.filter((question) => questionMatchesFilter(question, item.id)).length;
                  const active = item.id === questionFilter;
                  return (
                    <Link
                      key={item.id}
                      href={tabHref("sorular", item.id === "tumu" ? "" : `&filtre=${item.id}`)}
                      aria-current={active ? "page" : undefined}
                      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] ${active ? "border-pn-text bg-pn-text font-semibold text-white" : "border-pn-border text-pn-text-secondary hover:bg-pn-hover"}`}
                    >
                      {item.label}
                      <span className="tabular-nums opacity-80">{count}</span>
                    </Link>
                  );
                })}
              </nav>
              {editor(["questions"])}
            </>
          ) : null}

          {tab === "oturumlar" && sessionPlan ? (
            <Section title="Oturumlar" description="LGS düzeni: her oturum kendi süresiyle açılır; aradan sonra sıradaki oturum taze süreyle başlar." divider={false}>
              <AdminSessionPlan
                examId={exam.id}
                plan={sessionPlan}
                sectionTitles={Object.fromEntries(version.sections.map((section) => [section.code, section.title]))}
                editable={caps.edit && draftEditable}
              />
            </Section>
          ) : null}

          {tab === "zamanlama" ? editor(["plan", "security", "publish"]) : null}

          {tab === "katilimcilar" ? (
            <>
              <AdminAssignmentPanel examId={exam.id} canEdit={exam.status !== "ARCHIVED"} />
              <AdminBookletAssignmentPanel examId={exam.id} canEdit={!["ENDED", "SCORED", "RELEASED", "ARCHIVED"].includes(exam.status)} />
            </>
          ) : null}

          {tab === "onizleme" ? (
            <>
              {caps.edit ? (
                <Section title="Öğrenci çözüm ekranı" description="Öğrencinin göreceği çözücünün aynısı. Deneme başlatılmaz, cevaplar kaydedilmez." divider={false}>
                  <div className="flex flex-wrap gap-2">
                    {(sessionPlan ?? [null]).flatMap((item) =>
                      bookletCodes.map((code) => {
                        const params = new URLSearchParams();
                        if (item) params.set("oturum", item.key);
                        if (bookletCodes.length > 1) params.set("kitapcik", code);
                        const qs = params.toString();
                        const label = `${item ? `${item.title} oturumunu` : "Çözücüyü"} önizle${bookletCodes.length > 1 ? ` (${code})` : ""}`;
                        return (
                          <Link key={`${item?.key ?? "tek"}-${code}`} href={`/panel/odk/yonetim/sinavlar/${exam.id}/onizleme/cozucu${qs ? `?${qs}` : ""}`} className={buttonClass("secondary", "md")}>
                            {label}
                          </Link>
                        );
                      }),
                    )}
                  </div>
                </Section>
              ) : null}
              <AdminPreviewPanel examId={exam.id} />
            </>
          ) : null}

          {tab === "canli" ? (
            <Section title="Canlı durum" divider={false}>
              {(() => {
                const counters = opsCounters(attempts, assignedCount, now);
                return (
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    {[
                      ["Başlamadı", counters.notStarted],
                      ["Devam ediyor", counters.inProgress],
                      ["Bağlantı koptu", counters.disconnected],
                      ["Teslim", counters.submitted],
                      ["Otomatik teslim", counters.autoSubmitted],
                      ["İnceleme", counters.review],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-pn-border px-3 py-2.5">
                        <dt className="text-[12.5px] text-pn-text-muted">{label}</dt>
                        <dd className="text-[20px] font-semibold tabular-nums text-pn-text">{value}</dd>
                      </div>
                    ))}
                  </dl>
                );
              })()}
              <Link href={`/panel/odk/yonetim/operasyon?deneme=${exam.id}`} className={buttonClass("secondary", "md", "mt-4")}>
                Canlı operasyonda aç
              </Link>
            </Section>
          ) : null}

          {tab === "puanlama" ? (
            <>
              {editor(["scoring"])}
              {caps.score ? <AdminResultsReviewPanel examId={exam.id} examStatus={exam.status} /> : null}
              {caps.rescore && ["LIVE", "ENDED", "SCORED", "RELEASED"].includes(exam.status) ? (
                <RevisionTab examId={exam.id} studentNames={Object.fromEntries(attempts.map((attempt) => [attempt.id, attempt.student.fullName || attempt.student.email]))} />
              ) : null}
            </>
          ) : null}

          {tab === "butunluk" ? (
            <AdminIntegrityReviewPanel
              examId={exam.id}
              attempts={attempts.map((attempt) => ({
                id: attempt.id,
                studentName: attempt.student.fullName || attempt.student.email,
                status: attempt.status,
                integrityLevel: attempt.integrityLevel,
                integrityReviewedAt: attempt.integrityReviewedAt?.toISOString() || null,
              }))}
            />
          ) : null}

          {tab === "raporlar" ? <ExamReportTab examId={exam.id} assignedCount={assignedCount} attempts={attempts} /> : null}

          {tab === "gecmis" ? <ExamHistoryTab exam={exam} /> : null}
        </div>

        {showRail ? (
          <aside aria-labelledby="hazirlik-rayi" className="h-fit rounded-lg border border-pn-border p-4 lg:sticky lg:top-4">
            <h2 id="hazirlik-rayi" className="flex items-baseline justify-between text-[14px] font-semibold text-pn-text">
              Hazırlık durumu
              <span className="tabular-nums text-pn-text-muted">
                {readiness.done}/{readiness.items.length}
              </span>
            </h2>
            <ul className="mt-3 space-y-2.5">
              {readiness.items.map((item) => (
                <li key={item.id} className="flex gap-2 text-[13.5px]">
                  {item.ok ? (
                    <Check size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-(--pn-tone-success)" />
                  ) : (
                    <CircleAlert size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-(--pn-tone-critical)" />
                  )}
                  <span className="min-w-0">
                    <span className="sr-only">{item.ok ? "Tamam: " : "Eksik: "}</span>
                    <span className="font-medium text-pn-text">{item.label}</span>
                    <span className="block text-[12.5px] text-pn-text-muted">
                      {item.href && caps.edit ? (
                        <Link href={item.href} className="underline underline-offset-2 hover:text-pn-text">
                          {item.detail}
                        </Link>
                      ) : (
                        item.detail || "—"
                      )}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </div>
    </PanelShell>
  );
}

async function RevisionTab({ examId, studentNames }: { examId: string; studentNames: Record<string, string> }) {
  const panel = await loadAnswerKeyRevisionPanel(examId);
  if (!panel) return null;
  return <AdminAnswerKeyRevisionPanel examId={examId} questions={panel.questions} revisions={panel.revisions} studentNames={studentNames} />;
}

async function ExamHistoryTab({ exam }: { exam: Parameters<typeof loadExamHistory>[0] }) {
  const events = await loadExamHistory(exam);
  return (
    <Section title="Geçmiş" description="İçe aktarmalar, cevap anahtarı revizyonları ve durum değişiklikleri." divider={false}>
      {events.length ? (
        <ol className="divide-y divide-pn-border-subtle rounded-lg border border-pn-border">
          {events.map((event) => (
            <li key={event.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2.5 text-[13.5px]">
              <span className="min-w-0 text-pn-text">
                {event.label}
                {event.actor ? <span className="text-pn-text-muted"> · {event.actor}</span> : null}
              </span>
              <time dateTime={event.at.toISOString()} className="shrink-0 font-mono text-[12.5px] text-pn-text-muted">
                {DATE_TIME.format(event.at)}
              </time>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState title="Henüz kayıtlı olay yok." />
      )}
    </Section>
  );
}

type ReportAttempt = {
  id: string;
  status: string;
  integrityLevel: "NORMAL" | "REVIEW" | "HIGH";
  startedAt: Date;
  submittedAt: Date | null;
  student: { fullName: string | null; email: string };
  score: null | {
    attemptId: string;
    correctCount?: number;
    wrongCount?: number;
    blankCount?: number;
    totalNet?: unknown;
    publicationStatus?: "HIDDEN" | "PUBLISHED";
    activeDurationMs?: number | null;
    sectionBreakdown?: unknown;
  };
};

async function ExamReportTab({ examId, assignedCount, attempts }: { examId: string; assignedCount: number; attempts: ReportAttempt[] }) {
  const { summary, weakest, outcomeTitles } = await loadOdkExamReport(examId, assignedCount, attempts);
  const net = (value: number | null) => (value === null ? "—" : value.toFixed(2));
  return (
    <>
      <Section title="Özet" divider={false}>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Teslim", `${summary.submitted}/${Math.max(assignedCount, summary.participation)}`],
            ["Ortalama net", net(summary.averageNet)],
            ["Medyan net", net(summary.medianNet)],
            ["Bütünlük incelemesi", String(summary.integrityReviewCount)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-pn-border px-3 py-2.5">
              <dt className="text-[12.5px] text-pn-text-muted">{label}</dt>
              <dd className="text-[20px] font-semibold tabular-nums text-pn-text">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section title="Bölüm ortalamaları">
        {summary.sectionAverages.length ? (
          <PanelTable caption="Bölüm ortalamaları" columns={["Bölüm", "Ortalama net", "Doğruluk"]}>
            {summary.sectionAverages.flatMap((section) => [
              <PanelTableRow key={section.code}>
                <PanelTableCell>{section.title}</PanelTableCell>
                <PanelTableCell>
                  <span className="tabular-nums">{net(section.averageNet)}</span>
                </PanelTableCell>
                <PanelTableCell>
                  <span className="tabular-nums">{section.averageAccuracy === null ? "—" : `%${Math.round(section.averageAccuracy)}`}</span>
                </PanelTableCell>
              </PanelTableRow>,
              // Alt test ortalamaları (Faz 6): ders satırının altında, ham net.
              ...summary.subtestAverages
                .filter((subtest) => subtest.sectionCode === section.code)
                .map((subtest) => (
                  <PanelTableRow key={`${section.code}:${subtest.code}`}>
                    <PanelTableCell>
                      <span className="pl-4 text-pn-text-secondary">
                        <span aria-hidden="true">↳ </span>
                        {subtest.title}
                        <span className="sr-only"> ({section.title} alt testi)</span>
                      </span>
                    </PanelTableCell>
                    <PanelTableCell>
                      <span className="tabular-nums text-pn-text-secondary">{net(subtest.averageNet)}</span>
                    </PanelTableCell>
                    <PanelTableCell>
                      <span className="tabular-nums text-pn-text-secondary">{subtest.averageAccuracy === null ? "—" : `%${Math.round(subtest.averageAccuracy)}`}</span>
                    </PanelTableCell>
                  </PanelTableRow>
                )),
            ])}
          </PanelTable>
        ) : (
          <p className="text-[14px] text-pn-text-muted">Puanlanmış teslim olunca bölüm ortalamaları burada görünür.</p>
        )}
      </Section>
      <Section title="En zayıf kazanımlar" description="Bu denemedeki ortalama doğruluğa göre.">
        {weakest.length ? (
          <ul className="divide-y divide-pn-border-subtle rounded-lg border border-pn-border">
            {weakest.map((row) => (
              <li key={row.outcomeId} className="flex items-baseline justify-between gap-4 px-4 py-2.5 text-[13.5px]">
                <span className="min-w-0 text-pn-text">{outcomeTitles.get(row.outcomeId) ?? "Kazanım"}</span>
                <span className="shrink-0 tabular-nums text-pn-text-secondary">%{Math.round(Number(row._avg.accuracyRate ?? 0))}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-pn-text-muted">Kazanım bazlı sonuç henüz yok.</p>
        )}
      </Section>
    </>
  );
}
