import Link from "next/link";
import { BarChart3, ClipboardCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireProductRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelPageHeader } from "@/components/panel/panel-page-header";
import { OdkStatusBadge } from "@/components/odk/odk-status-badge";
import { examStatusPresentation } from "@/lib/odk/presentation";

export const dynamic = "force-dynamic";

export default async function OdkAdminResultsHubPage() {
  const session = await requireProductRole("ODK", "ADMIN");
  const exams = await prisma.odkExam.findMany({
    where: { status: { in: ["ENDED", "SCORED", "RELEASED"] } },
    orderBy: [{ endsAt: "desc" }, { updatedAt: "desc" }],
    take: 100,
    select: {
      id: true,
      title: true,
      family: true,
      status: true,
      endsAt: true,
      resultsReleasedAt: true,
      _count: { select: { attempts: true, assignments: { where: { isActive: true } } } },
      attempts: {
        where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED", "REVIEW_REQUIRED"] } },
        select: { integrityLevel: true, score: { select: { publicationStatus: true } } },
      },
    },
  });

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK">
      <PanelPageHeader
        eyebrow="Sonuçlar"
        title="Deneme sonuçlarını inceleyin ve yayınlayın."
        description="Puanlama tamamlanması sonucu öğrenciye açmaz. Yayın ayrı bir yönetim aksiyonudur."
        icon={BarChart3}
      />
      <div className="mt-7 overflow-x-auto rounded-3xl border border-[var(--site-line)] bg-white">
        <table className="w-full min-w-[860px] text-left text-xs">
          <thead className="bg-[var(--site-bg-warm)] text-[10px] uppercase tracking-wide text-[var(--site-muted)]">
            <tr>
              <th className="px-4 py-3">Deneme</th>
              <th className="px-3 py-3">Tür</th>
              <th className="px-3 py-3">Teslim</th>
              <th className="px-3 py-3">Integrity</th>
              <th className="px-3 py-3">Durum</th>
              <th className="px-3 py-3">Sonuç</th>
            </tr>
          </thead>
          <tbody>
            {exams.map((exam) => {
              const presentation = examStatusPresentation[exam.status];
              const reviewCount = exam.attempts.filter((attempt) => attempt.integrityLevel !== "NORMAL").length;
              const published = exam.attempts.filter((attempt) => attempt.score?.publicationStatus === "PUBLISHED").length;
              return (
                <tr key={exam.id} className="border-t border-[var(--site-line)] hover:bg-[var(--site-bg-warm)]/60">
                  <td className="px-4 py-3">
                    <Link href={`/panel/odk/yonetim/sinavlar/${exam.id}#adim-sonuc`} className="font-bold text-[var(--site-ink)] hover:text-[var(--brand-olive)]">{exam.title}</Link>
                  </td>
                  <td className="px-3 py-3 font-extrabold text-[var(--brand-olive)]">{exam.family}</td>
                  <td className="px-3 py-3">{exam.attempts.length}/{exam._count.assignments || exam._count.attempts}</td>
                  <td className="px-3 py-3">{reviewCount}</td>
                  <td className="px-3 py-3"><OdkStatusBadge label={presentation.label} tone={presentation.tone} /></td>
                  <td className="px-3 py-3 font-bold">{exam.status === "RELEASED" ? `Yayınlandı (${published})` : exam.status === "SCORED" ? "Gizli / inceleme" : "Puanlama bekliyor"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!exams.length ? (
          <div className="p-8 text-center">
            <ClipboardCheck size={22} className="mx-auto text-[var(--site-muted)]" />
            <h3 className="mt-3 text-sm font-extrabold">Henüz kapanmış deneme yok.</h3>
            <Link href="/panel/odk/yonetim/sinavlar" className="panel-text-link mt-3">Denemelere git</Link>
          </div>
        ) : null}
      </div>
    </PanelShell>
  );
}
