import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { StudentWeeklyGoal } from "@/components/panel/student-weekly-goal";
import { PanelEmpty, Section, buttonClass } from "@/components/panel/ui";
import {
  AcademicBlock,
  BehavioralBlock,
  GidisatHero,
} from "@/components/panel/analiz";
import {
  loadStudentProgressInsight,
  formatPeriodRangeLabel,
} from "@/lib/progress-insights/server";
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
          sentences={[
            "Profilin hazırlanıyor ⏳ Tamamlandığında gidişat özetin burada açılacak.",
          ]}
        />
        <PanelEmpty
          title="Profilin hazırlanıyor ⏳"
          body="Öğrenci profilin tamamlandığında analiz özetin burada açılacak."
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
        title="Profilin hazırlanıyor ⏳"
        body="Öğrenci profilin tamamlandığında analiz özetin burada açılacak."
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
          initial={
            profile.weeklyGoal ||
            "Bu hafta en az üç odaklı çalışma tamamlayacağım."
          }
        />
      </div>

      {bundle.isEmpty ? (
        <PanelEmpty
          title="Gidişatın burada şekillenecek 🌱"
          body="Derslerin işlendikçe, çalışmaların tamamlandıkça ve denemelerin girildikçe ilerlemeni burada göreceksin."
        />
      ) : (
        <>
          <AcademicBlock
            academic={bundle.academic}
            emptyTitle="Deneme grafiğin için bir sonuç daha yeterli 📈"
            emptyBody="İkinci denemen girildiğinde net eğrin burada belirecek. Katılım ve çalışmalarını aşağıda bulabilirsin."
          />
          <BehavioralBlock behavioral={bundle.behavioral} />
        </>
      )}

      {flags.mockExamAnalysis ? (
        <Section
          id="dis-deneme"
          title="Dış deneme sonucu"
          description="Okulda, kursta ya da başka bir platformda çözdüğün denemenin sonucunu buraya ekleyebilirsin 📊"
          actions={
            <Link href="/panel/ogrenci/denemeler" className={buttonClass("secondary", "sm")}>
              Dış Deneme Ekle
            </Link>
          }
        >
          {null}
        </Section>
      ) : null}
    </>,
  );
}
