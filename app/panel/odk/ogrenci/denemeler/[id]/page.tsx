import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireProductRole } from "@/lib/auth/guards";
import { attemptStartError } from "@/lib/odk/attempt-domain";
import { getStudentExam } from "@/lib/odk/student-exam-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { StudentExamStart } from "@/components/odk/student-exam-start";
import { PageHeader, PropertyList, PropertyRow, Section, StatusBadge, buttonClass } from "@/components/panel/ui";
import { studentExamState } from "@/lib/odk/student-exam-state";
import { readSessionPlan, sessionPlanTotalMinutes } from "@/lib/odk/exam-sessions";
import { getOdkExamFamilyCode } from "@/lib/odk/exam-family";

export const dynamic = "force-dynamic";
const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "Europe/Istanbul",
});

export default async function OdkStudentExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireProductRole("ODK", "STUDENT");
  const { id } = await params;
  const data = await getStudentExam(id, session.userId);
  if (!data) notFound();
  const { exam, attempt, startDecision, resultAvailable } = data;
  const version = exam.currentVersion;
  if (!version) notFound();
  const activeAttempt = attempt?.status === "IN_PROGRESS";
  const completed = attempt && attempt.status !== "IN_PROGRESS";
  const submittedAwaitingResult = completed && !resultAvailable;
  const startWindowCopy =
    exam.startsAt && exam.endsAt
      ? `${dateFormatter.format(exam.startsAt)} · ${dateFormatter.format(exam.endsAt)}`
      : exam.startsAt
        ? `${dateFormatter.format(exam.startsAt)}`
        : "Başlama saati bekleniyor";

  const state = studentExamState({ id: exam.id, attempts: attempt ? [{ status: attempt.status }] : [], startDecision, resultAvailable });
  const questionCount = version.sections.reduce((sum, section) => sum + section.questions.length, 0);
  const sessionPlan = readSessionPlan(version.settings);

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK" pageTitle={exam.title}>
      <div className="max-w-[880px]">
        <Link href="/panel/odk/ogrenci/denemeler" className="mb-2 inline-flex items-center gap-1.5 text-[13px] text-pn-text-muted hover:text-pn-text">
          <ArrowLeft size={14} aria-hidden="true" /> Denemeler
        </Link>
        <PageHeader
          eyebrow={getOdkExamFamilyCode(exam) ?? "Deneme Ligi"}
          title={exam.title}
          description={startWindowCopy}
          metadata={<StatusBadge label={state.label} tone={state.tone} live={state.key === "AVAILABLE"} />}
        />

        <Section id="deneme-bilgisi" title="Deneme bilgisi" divider={false}>
          <PropertyList>
            <PropertyRow label="Soru sayısı">{questionCount} soru</PropertyRow>
            <PropertyRow label="Bölümler">{version.sections.map((section) => section.title).join(" · ") || "—"}</PropertyRow>
            {sessionPlan ? (
              <PropertyRow label="Oturumlar">
                {sessionPlan
                  .map((item, index) => `${item.title} ${item.durationMinutes} dk${index < sessionPlan.length - 1 && item.breakAfterMinutes ? ` · ${item.breakAfterMinutes} dk ara` : ""}`)
                  .join(" · ")}
              </PropertyRow>
            ) : null}
            <PropertyRow label="Süre">
              {version.durationMinutes} dakika{sessionPlan ? ` (aralar hariç; toplam ${sessionPlanTotalMinutes(sessionPlan)} dakika)` : ""}
            </PropertyRow>
            <PropertyRow label="Açılış – kapanış">{startWindowCopy}</PropertyRow>
            <PropertyRow label="Geç giriş">{exam.lateEntryMinutes ? `Başlangıçtan sonra ${exam.lateEntryMinutes} dakika` : "Yok"}</PropertyRow>
            <PropertyRow label="Gözetim">{exam.meetRequired ? "Meet zorunlu" : "Meet gerekmiyor"}</PropertyRow>
          </PropertyList>
        </Section>

        <Section id="kurallar" title="Kurallar">
          <ul className="list-disc space-y-1 pl-5 text-[14px] text-pn-text-secondary">
            <li>Süre sunucuda tutulur; sayfayı kapatmak süreyi durdurmaz.</li>
            <li>Her cevap seçtiğin anda kaydedilir; bağlantı koparsa geri gelince kayıt sürer.</li>
            <li>Bekleyen kayıt varken teslim kapanır; süre bitince deneme otomatik teslim edilir.</li>
            {exam.meetRequired ? <li>Deneme boyunca Meet görüşmesinde kalman gerekir.</li> : null}
            {sessionPlan ? (
              <li>
                Oturumlar sırayla açılır. Bir oturumu bitirince (ya da süresi dolunca) cevapları kilitlenir; aradan sonra sıradaki
                oturum kendi süresiyle açılır. Teslim son oturumda yapılır.
              </li>
            ) : null}
          </ul>
        </Section>

        <Section id="baslat" title={completed ? "Durum" : activeAttempt ? "Denemeye devam et" : "Başlamadan önce"}>
          {completed ? (
            <div className="rounded-md border border-pn-border p-4">
              <p className="text-[15px] font-semibold text-pn-text">
                {submittedAwaitingResult ? "Denemen tamamlandı." : "Denemen teslim edildi."}
              </p>
              <p className="mt-1 text-[14px] text-pn-text-secondary">
                {resultAvailable ? "Sonucun ve kazanım analizin açıklandı." : "Sonucun açıklandığında burada görebileceksin."}
              </p>
              {resultAvailable ? (
                <Link href={`/panel/odk/ogrenci/denemeler/${exam.id}/sonuc`} className={buttonClass("primary", "md", "mt-3")}>
                  Sonucunu Gör
                </Link>
              ) : (
                <p className="mt-3">
                  <StatusBadge label="Sonuç bekleniyor" tone="neutral" />
                </p>
              )}
            </div>
          ) : (
            <StudentExamStart
              examId={exam.id}
              meetRequired={exam.meetRequired}
              meetUrl={exam.meetUrl}
              canStart={startDecision.ok}
              startError={startDecision.ok ? null : attemptStartError[startDecision.code]}
              activeAttempt={activeAttempt}
              durationMinutes={sessionPlan ? undefined : version.durationMinutes}
            />
          )}
        </Section>
      </div>
    </PanelShell>
  );
}
