import type { OdkExamWorkspace } from "@/lib/odk/exam-workspace-server";
import type { OdkExamWorkspaceView } from "@/lib/mobile-contracts/odk-management-exam";
import { attemptStatusPresentation, examStatusPresentation, integrityLevelPresentation } from "@/lib/odk/presentation";
import { opsCounters, questionMatchesFilter, type ActivityEvent } from "@/lib/odk/staff-workspace";
import { FULLSCREEN_LABEL_TEXT } from "@/lib/odk/exam-workspace-labels";
import { operationDigest } from "@/lib/panel/group-mutation-core";

/** K03 mobil projeksiyonu — web çalışma alanıyla aynı veri; sekmeye özgü bloklar yalnız o sekmede. */
const TONE = { neutral: "neutral", info: "info", warning: "warning", success: "success", danger: "critical" } as const;
const iso = (value: Date | null | undefined) => value?.toISOString() ?? null;

/** Çalışma alanı yazmalarının beklenen sürümü: sınav + aktif sürüm durumu ve güncellenme anları. */
export function odkExamRevision(ws: Pick<OdkExamWorkspace, "exam" | "version">) {
  return operationDigest({ exam: ws.exam.id, status: ws.exam.status, updatedAt: ws.exam.updatedAt.toISOString(), version: ws.version.id, versionStatus: ws.version.status, versionUpdatedAt: ws.version.updatedAt.toISOString() });
}

export function toMobileOdkExamWorkspace(
  ws: OdkExamWorkspace,
  extras: {
    now: Date;
    report?: { summary: { submitted: number; participation: number; averageNet: number | null; medianNet: number | null; integrityReviewCount: number; sectionAverages: Array<{ code: string; title: string; averageNet: number | null; averageAccuracy: number | null }> }; weakest: Array<{ outcomeId: string; _avg: { accuracyRate: unknown } }>; outcomeTitles: Map<string, string> } | null;
    history?: ActivityEvent[] | null;
  },
): OdkExamWorkspaceView {
  const { exam, version, caps, tab } = ws;
  const status = examStatusPresentation[exam.status];
  const description = `${exam.structureMode === "FULL_TEMPLATE" ? "Tam deneme" : "Matematik"}${exam.series ? ` · ${exam.series.title}` : ""}`;
  return {
    contractVersion: 1,
    revision: odkExamRevision(ws),
    tab,
    tabs: ws.tabs.map((item) => ({ id: item.id, label: item.label })),
    caps,
    exam: {
      id: exam.id,
      title: exam.title,
      familyCode: ws.familyCode,
      status: exam.status,
      statusLabel: status.label,
      tone: TONE[status.tone],
      versionNumber: version.versionNumber,
      versionStatus: version.status,
      description,
      startsAt: iso(exam.startsAt),
      endsAt: iso(exam.endsAt),
      lateEntryMinutes: exam.lateEntryMinutes,
      durationMinutes: version.durationMinutes,
      meet: exam.meetRequired ? (exam.meetUrl ? "Zorunlu · bağlantı tanımlı" : "Zorunlu · bağlantı eksik") : "Gerekmiyor",
      createdAt: exam.createdAt.toISOString(),
      contentLockedAt: iso(exam.contentLockedAt),
      publishedAt: iso(exam.publishedAt),
      resultsReleasedAt: iso(exam.resultsReleasedAt),
      windowEnded: ws.windowEnded,
      draftEditable: ws.draftEditable,
    },
    counts: { assigned: ws.assignedCount, attempts: ws.attempts.length, submitted: ws.submittedCount, scored: ws.scoredCount, review: ws.reviewCount },
    primaryAction: ws.primary,
    readiness: { done: ws.readiness.done, items: ws.readiness.items.map((item) => ({ id: item.id, label: item.label, ok: item.ok, detail: item.detail || "—" })) },
    issues: {
      total: ws.issues.length,
      items: ws.issues.slice(0, 12).map((issue) => ({ level: issue.level, message: issue.message, questionNumber: "questionNumber" in issue && typeof issue.questionNumber === "number" ? issue.questionNumber : null })),
    },
    questions:
      tab === "sorular" && caps.edit
        ? {
            filter: ws.questionFilter,
            counts: {
              tumu: ws.questions.length,
              kazanimsiz: ws.questions.filter((question) => questionMatchesFilter(question, "kazanimsiz")).length,
              anahtarsiz: ws.questions.filter((question) => questionMatchesFilter(question, "anahtarsiz")).length,
            },
            rows: ws.questions
              .filter((question) => questionMatchesFilter(question, ws.questionFilter))
              .map((question) => ({
                id: question.id,
                number: question.questionNumber,
                section: question.sectionTitle,
                correctOption: question.correctOption,
                outcomeCount: question.outcomeIds.length,
                hasPrimaryOutcome: Boolean(question.primaryOutcomeId),
                contentType: question.contentType,
                bookletPage: question.bookletPage,
              })),
          }
        : null,
    files: tab === "icerik" ? version.files.map((file) => ({ id: file.id, type: file.type, fileName: file.fileName })) : null,
    sessions:
      tab === "oturumlar" && ws.sessionPlan
        ? ws.sessionPlan.map((item) => ({
            key: item.key,
            title: item.title,
            sections: item.sectionCodes.map((code) => version.sections.find((section) => section.code === code)?.title ?? code),
            durationMinutes: item.durationMinutes,
            breakAfterMinutes: item.breakAfterMinutes,
          }))
        : null,
    schedule:
      tab === "zamanlama"
        ? {
            fullscreenLabel: FULLSCREEN_LABEL_TEXT[ws.security.fullscreenMode],
            blockCopyPaste: ws.security.blockCopyPaste,
            logCopyPaste: ws.security.logCopyPaste,
            trackVisibility: ws.security.trackVisibility,
            allowExtraTimeMinutes: ws.security.allowExtraTimeMinutes,
            autoSubmit: version.autoSubmit,
          }
        : null,
    live: tab === "canli" ? opsCounters(ws.attempts, ws.assignedCount, extras.now) : null,
    integrity:
      tab === "butunluk"
        ? ws.attempts.map((attempt) => {
            const statusView = attemptStatusPresentation[attempt.status];
            const level = integrityLevelPresentation[attempt.integrityLevel];
            return {
              id: attempt.id,
              name: attempt.student.fullName || attempt.student.email,
              statusLabel: statusView.label,
              tone: TONE[statusView.tone],
              level: attempt.integrityLevel,
              levelLabel: level.label,
              levelTone: TONE[level.tone],
              reviewed: Boolean(attempt.integrityReviewedAt),
            };
          })
        : null,
    report:
      tab === "raporlar" && extras.report
        ? {
            submitted: extras.report.summary.submitted,
            participation: Math.max(ws.assignedCount, extras.report.summary.participation),
            averageNet: extras.report.summary.averageNet,
            medianNet: extras.report.summary.medianNet,
            integrityReviewCount: extras.report.summary.integrityReviewCount,
            sections: extras.report.summary.sectionAverages,
            weakest: extras.report.weakest.map((row) => ({ outcomeId: row.outcomeId, title: extras.report!.outcomeTitles.get(row.outcomeId) ?? "Kazanım", accuracy: Math.round(Number(row._avg.accuracyRate ?? 0)) })),
          }
        : null,
    history: tab === "gecmis" && extras.history ? extras.history.map((event) => ({ id: event.id, label: event.label, actor: event.actor ?? null, at: event.at.toISOString() })) : null,
  };
}
