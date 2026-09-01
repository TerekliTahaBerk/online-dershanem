import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireProductRole } from "@/lib/auth/guards";
import { getOdkExamReadiness } from "@/lib/odk/admin-exam-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { AdminExamEditor } from "@/components/odk/admin-exam-editor";
import { AdminJsonImportPanel } from "@/components/odk/admin-json-import-panel";

export const dynamic = "force-dynamic";
function localInput(value: Date | null) { if (!value) return ""; return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(value).replace(" ", "T"); }

export default async function OdkAdminExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireProductRole("ODK", "ADMIN"); const { id } = await params; const { exam, issues } = await getOdkExamReadiness(id); if (!exam?.currentVersion) notFound();
  const outcomeWhere = exam.structureMode === "MATH_ONLY"
    ? { isActive: true as const, unit: { subject: { version: { exam: exam.family, status: "ACTIVE" as const }, OR: [{ code: { contains: "MAT", mode: "insensitive" as const } }, { name: { contains: "Matematik", mode: "insensitive" as const } }] } } }
    : { isActive: true as const, unit: { subject: { version: { exam: exam.family, status: "ACTIVE" as const } } } };
  const [outcomes, attempts] = await Promise.all([
    prisma.learningOutcome.findMany({ where: outcomeWhere, orderBy: [{ unit: { name: "asc" } }, { code: "asc" }], include: { unit: { select: { name: true } } }, take: 2000 }),
    prisma.odkExamAttempt.findMany({ where: { examId: id, status: { not: "VOID" } }, select: { status: true, integrityLevel: true, score: { select: { attemptId: true } } } }),
  ]);
  const questions = exam.currentVersion.sections.flatMap((section) => section.questions.map((question) => ({
    id: question.id,
    questionNumber: question.questionNumber,
    correctOption: question.correctOption,
    difficulty: question.difficulty,
    bookletPage: question.bookletPage,
    outcomeIds: question.outcomes.map((outcome) => outcome.outcomeId),
    primaryOutcomeId: question.outcomes.find((outcome) => outcome.isPrimary)?.outcomeId || null,
  })));
  const reviewCount = attempts.filter((attempt) => attempt.integrityLevel !== "NORMAL").length;
  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK">
      <Link href="/panel/odk/yonetim/sinavlar" className="panel-text-link"><ArrowLeft size={13} /> Denemelere dön</Link>
      <header className="mt-5">
        <p className="text-xs font-extrabold uppercase text-[var(--brand-olive)]">{exam.family} · {exam.structureMode === "FULL_TEMPLATE" ? "Tam deneme" : "Matematik"} · sürüm {exam.currentVersion.versionNumber}</p>
        <h1 className="mt-2 text-[26px] font-extrabold leading-[1.25] tracking-[-0.02em]">{exam.title}</h1>
        <p className="mt-2 text-sm text-[var(--site-body)]">Sonuçlar yönetim yayınlamadan öğrenciye açılmaz. LIVE sonrası kritik alanlar kilitlenir.</p>
      </header>
      <div className="mt-7 space-y-6">
        {exam.status === "DRAFT" || exam.currentVersion.status === "DRAFT" ? <AdminJsonImportPanel examId={exam.id} /> : null}
        <AdminExamEditor
          exam={{
            id: exam.id,
            title: exam.title,
            family: exam.family,
            status: exam.status,
            startsAt: localInput(exam.startsAt),
            endsAt: localInput(exam.endsAt),
            lateEntryMinutes: exam.lateEntryMinutes,
            meetRequired: exam.meetRequired,
            meetUrl: exam.meetUrl || "",
            versionStatus: exam.currentVersion.status,
            durationMinutes: exam.currentVersion.durationMinutes,
            files: exam.currentVersion.files.map((file) => ({ id: file.id, type: file.type, fileName: file.fileName })),
            questions,
          }}
          outcomes={outcomes.map((outcome) => ({ id: outcome.id, label: `${outcome.code} · ${outcome.unit.name} · ${outcome.title}` }))}
          issues={issues}
          resultStats={{
            attemptCount: attempts.length,
            submittedCount: attempts.filter((attempt) => attempt.status === "SUBMITTED" || attempt.status === "AUTO_SUBMITTED" || attempt.status === "REVIEW_REQUIRED").length,
            scoredCount: attempts.filter((attempt) => attempt.score).length,
            examEnded: Boolean(exam.endsAt && exam.endsAt <= new Date()),
            integrityReviewCount: reviewCount,
          }}
        />
      </div>
    </PanelShell>
  );
}
