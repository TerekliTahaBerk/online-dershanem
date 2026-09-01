import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { StudentWeeklyGoal } from "@/components/panel/student-weekly-goal";
import { PanelEmpty } from "@/components/panel/ui";
import { AcademicBlock, BehavioralBlock, GidisatHero } from "@/components/panel/analiz";
import { loadStudentProgressInsight, formatPeriodRangeLabel } from "@/lib/progress-insights/server";
import { PANEL_DOMAIN } from "@/lib/panel/domain-vocabulary";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * ÖĞRENCİ · ANALİZ — akademik + davranışsal gidişat.
 * Flag kapalıysa 404; eski `/gelisim` Analiz'e yönlendirir.
 */
export default async function StudentAnalizPage() {
  const session = await requireRole("STUDENT");
  const flags = getPanelFeatureFlags();
  if (!flags.progressInsights) notFound();

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true, weeklyGoal: true },
  });

  const shell = (children: React.ReactNode) => (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle={PANEL_DOMAIN.analiz}
    >
      <div className="max-w-[1000px]">{children}</div>
    </PanelShell>
  );

  if (!profile) {
    return shell(
      <>
        <GidisatHero
          title="Gidişatın"
          periodLabel="Analiz"
          sentences={["Profilin hazırlanıyor. Tamamlandığında gidişat özetin burada açılır."]}
        />
        <PanelEmpty
          title="Profilin hazırlanıyor."
          body="Öğrenci profilin tamamlandığında analiz özetin burada açılır."
        />
      </>,
    );
  }

  const bundle = await loadStudentProgressInsight({
    studentProfileId: profile.id,
    audience: "student",
    includeExams: true,
  });

  if (!bundle) {
    return shell(
      <PanelEmpty
        title="Profilin hazırlanıyor."
        body="Öğrenci profilin tamamlandığında analiz özetin burada açılır."
      />,
    );
  }

  return shell(
    <>
      <GidisatHero
        title="Gidişatın"
        periodLabel={formatPeriodRangeLabel(bundle.period)}
        sentences={bundle.narrative}
      />

      <div className="mt-6">
        <StudentWeeklyGoal
          initial={profile.weeklyGoal || "Bu hafta en az üç odaklı çalışma tamamlayacağım."}
        />
      </div>

      {bundle.isEmpty ? (
        <PanelEmpty
          title="Henüz gösterilecek veri yok."
          body="Derslerin işlendikçe, çalışmaların tamamlandıkça ve denemelerin girildikçe gidişatın burada birikir."
        />
      ) : (
        <>
          <AcademicBlock
            academic={bundle.academic}
            emptyTitle="Deneme grafiği için en az iki sonuç gerekiyor."
            emptyBody="İkinci deneme girildiğinde net eğrisi burada açılır. Katılım ve çalışmalar aşağıda."
          />
          <BehavioralBlock behavioral={bundle.behavioral} />
        </>
      )}

      {flags.mockExamAnalysis ? (
        <div className="mt-5 rounded-2xl border border-dc-line-soft bg-white p-4">
          <h2 className="text-sm font-bold text-dc-ink">Dış Deneme Sonucu</h2>
          <p className="mt-1 text-xs leading-6 text-dc-ink-muted">
            Okulda, kursta veya başka bir platformda çözdüğün deneme sonucunu buraya ekleyebilirsin.
          </p>
          <Link href="/panel/ogrenci/denemeler" className="panel-quick-action mt-3 inline-flex">
            Dış Deneme Ekle
          </Link>
        </div>
      ) : null}
    </>,
  );
}
