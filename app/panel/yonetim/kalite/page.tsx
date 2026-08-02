import { notFound } from "next/navigation";
import { BarChart3, BookOpenCheck, Clock3, Info, ShieldCheck, TrendingUp } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { calculateCohortGains, cohortSampleBand, COHORT_MIN_GAP_DAYS, COHORT_MIN_STUDENTS, COHORT_QUALITY_RULE_VERSION } from "@/lib/cohort-quality";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelNav } from "@/components/panel/panel-nav";
import { AdminPageHeader } from "@/components/panel/admin-page-header";

export const dynamic = "force-dynamic";

const errorLabels = { KNOWLEDGE: "Bilgi", PROCESS: "İşlem / yöntem", ATTENTION: "Dikkat", TIME: "Süre", BLANK: "Boş bırakma" } as const;

function percent(value: number | null) { return value === null ? "—" : `%${value.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`; }
function signed(value: number | null) { return value === null ? "—" : `${value > 0 ? "+" : ""}${value.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} puan`; }
function median(values: number[]) { if (!values.length) return null; const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; }

export default async function AdminQualityPage() {
  const session = await requireRole("ADMIN");
  if (!getPanelFeatureFlags().cohortQuality) notFound();
  const now = new Date(); const examSince = new Date(now.getTime() - 180 * 86_400_000); const qualitySince = new Date(now.getTime() - 30 * 86_400_000);
  const [exams, lessons, assignments, submissions] = await Promise.all([
    prisma.mockExam.findMany({ where: { takenAt: { gte: examSince } }, select: { studentId: true, exam: true, takenAt: true, sections: { select: { questionCount: true, correctCount: true, incorrectCount: true, errors: { select: { category: true } } } } } }),
    prisma.lesson.findMany({ where: { status: "COMPLETED", completedAt: { gte: qualitySince } }, select: { outcomeLinks: { select: { outcomeId: true } } } }),
    prisma.assignment.findMany({ where: { createdAt: { gte: qualitySince }, isActive: true }, select: { outcomeLinks: { select: { outcomeId: true } } } }),
    prisma.assignmentSubmission.findMany({ where: { submittedAt: { gte: qualitySince }, reviewedAt: { not: null } }, select: { submittedAt: true, reviewedAt: true } }),
  ]);
  const gains = calculateCohortGains(exams.map((exam) => ({ studentKey: exam.studentId, exam: exam.exam, takenAt: exam.takenAt, sections: exam.sections })));
  const ready = gains.filter((item) => item.status === "READY");
  const pairedTotal = gains.reduce((sum, item) => sum + item.pairedStudents, 0);
  await recordPanelProductEvent({ name: "cohort_quality_viewed", properties: { ruleVersion: COHORT_QUALITY_RULE_VERSION, readyCohortCount: ready.length, suppressedCohortCount: gains.length - ready.length, pairedStudentBand: cohortSampleBand(pairedTotal) } }, session.role);

  const taggedItems = [...lessons, ...assignments].filter((item) => item.outcomeLinks.length > 0).length;
  const evidenceCoverage = lessons.length + assignments.length ? Math.round((taggedItems / (lessons.length + assignments.length)) * 100) : null;
  const feedbackHours = submissions.flatMap((item) => item.reviewedAt ? [(item.reviewedAt.getTime() - item.submittedAt.getTime()) / 3_600_000] : []);
  const feedbackMedian = median(feedbackHours);
  const errorStudents = new Map<keyof typeof errorLabels, Set<string>>();
  for (const exam of exams) for (const section of exam.sections) for (const error of section.errors) {
    const students = errorStudents.get(error.category) || new Set<string>(); students.add(exam.studentId); errorStudents.set(error.category, students);
  }
  const commonErrors = [...errorStudents.entries()].filter(([, students]) => students.size >= COHORT_MIN_STUDENTS).sort((a, b) => b[1].size - a[1].size);

  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} nav={<PanelNav role={session.role} />}>
    <AdminPageHeader eyebrow="Son 180 gün" title="Öğrenme kalitesini adil bir zeminde görün." description="Aynı öğrencinin başlangıç ve takip ölçümünü eşler; öğrenci ya da öğretmen sıralaması üretmez." icon={BarChart3} meta={COHORT_QUALITY_RULE_VERSION} />
    <section className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950"><div className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0" size={18} /><div><h2 className="font-extrabold">Yorumlama sınırı</h2><p className="mt-1 leading-6">Bu görünüm nedensel bir “öğretmen etkisi” ölçmez. En az {COHORT_MIN_STUDENTS} öğrenci ve aynı sınav türünde en az {COHORT_MIN_GAP_DAYS} gün aralıklı iki ölçüm olmadan değişim istatistikleri gizlenir.</p></div></div></section>

    <section className="mt-5 grid gap-3 sm:grid-cols-3">
      <article className="panel-metric-card"><BookOpenCheck size={18} className="text-emerald-700" /><p className="mt-4 text-3xl font-extrabold">{percent(evidenceCoverage)}</p><p className="mt-1 text-xs text-[var(--site-muted)]">30 günlük kazanım etiketleme · {taggedItems}/{lessons.length + assignments.length}</p></article>
      <article className="panel-metric-card"><Clock3 size={18} className="text-violet-700" /><p className="mt-4 text-3xl font-extrabold">{feedbackMedian === null ? "—" : `${feedbackMedian.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} sa`}</p><p className="mt-1 text-xs text-[var(--site-muted)]">Kanıtlı ödev geri bildirim medyanı · {feedbackHours.length} inceleme</p></article>
      <article className="panel-metric-card"><TrendingUp size={18} className="text-sky-700" /><p className="mt-4 text-3xl font-extrabold">{ready.length}/4</p><p className="mt-1 text-xs text-[var(--site-muted)]">Yayınlanabilir sınav kohortu · eşleşmiş örneklem {cohortSampleBand(pairedTotal)} bandında</p></article>
    </section>

      <section className="mt-5 panel-surface overflow-hidden"><div className="border-b border-[var(--site-line)] p-5"><h2 className="text-sm font-extrabold">Başlangıca göre gözlenen değişim</h2><p className="mt-1 text-xs leading-5 text-[var(--site-muted)]">Net, toplam soru sayısına yüzde olarak normalize edilir. Medyan uç değerlerin etkisini azaltır; çeyrek aralığı belirsizliği ortaya koyar.</p></div><div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">{gains.map((gain) => <article key={gain.exam} className="rounded-2xl border border-[var(--site-line)] bg-[var(--site-bg-warm)] p-4"><div className="flex items-center justify-between"><h3 className="font-extrabold">{gain.exam}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${gain.status === "READY" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>{gain.status === "READY" ? "Yeterli örnek" : "Gizlendi"}</span></div>{gain.status === "READY" ? <><p className="mt-5 text-3xl font-extrabold">{signed(gain.medianChange)}</p><p className="mt-1 text-xs text-[var(--site-muted)]">Medyan değişim · orta %50: {signed(gain.lowerQuartile)} – {signed(gain.upperQuartile)}</p><dl className="mt-4 grid grid-cols-2 gap-2 text-xs"><div><dt className="text-[var(--site-muted)]">Pozitif değişim</dt><dd className="font-bold">{percent(gain.positiveChangePercent)}</dd></div><div><dt className="text-[var(--site-muted)]">Medyan aralık</dt><dd className="font-bold">{gain.medianGapDays} gün</dd></div></dl><p className="mt-4 border-t border-[var(--site-line)] pt-3 text-[11px] text-[var(--site-muted)]">Kapsama: {percent(gain.coveragePercent)} · {gain.observedStudents} gözlenen öğrenci{gain.dataThrough ? ` · veri ${new Intl.DateTimeFormat("tr-TR").format(gain.dataThrough)} tarihine kadar` : ""}</p></> : <div className="mt-5"><p className="font-bold">{COHORT_MIN_STUDENTS}'dan az uygun öğrenci</p><p className="mt-2 text-xs leading-5 text-[var(--site-muted)]">Tam sayı, kapsama, değişim yönü ve tazelik minimum örneklem tamamlanana kadar yayınlanmaz.</p></div>}</article>)}</div></section>

    <section className="mt-5 panel-surface p-5"><div className="flex gap-3"><Info size={18} className="mt-0.5 shrink-0 text-[var(--brand-olive)]" /><div><h2 className="text-sm font-extrabold">Tekrar eden ortak eksik sinyalleri</h2><p className="mt-1 text-xs leading-5 text-[var(--site-muted)]">Yalnız en az {COHORT_MIN_STUDENTS} farklı öğrencide işaretlenen kontrollü hata nedenleri gösterilir; öğrenci adı ve grup kırılımı açılmaz.</p></div></div>{commonErrors.length ? <div className="mt-4 flex flex-wrap gap-2">{commonErrors.map(([category, students]) => <span key={category} className="rounded-full border border-[var(--site-line)] bg-[var(--site-bg-warm)] px-3 py-2 text-xs font-bold">{errorLabels[category]} · {students.size} öğrenci</span>)}</div> : <p className="mt-4 rounded-2xl bg-[var(--site-bg-warm)] p-4 text-sm text-[var(--site-muted)]">Minimum örneklemi geçen ortak hata sinyali henüz yok.</p>}</section>
  </PanelShell>;
}
