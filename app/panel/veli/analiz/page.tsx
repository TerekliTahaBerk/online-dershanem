import { notFound } from "next/navigation";
import { requirePanelRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { resolveParentScope } from "@/lib/panel/parent-scope";
import { PanelShell } from "@/components/panel/panel-shell";
import { ChildSwitcher } from "@/components/panel/parent/child-switcher";
import { PanelEmpty } from "@/components/panel/ui";
import { AcademicBlock, BehavioralBlock, GidisatHero } from "@/components/panel/analiz";
import { loadStudentProgressInsight, formatPeriodRangeLabel } from "@/lib/progress-insights/server";
import { PANEL_DOMAIN } from "@/lib/panel/domain-vocabulary";

export const dynamic = "force-dynamic";

/**
 * VELİ · ANALİZ — sakin gidişat (akademik + davranış).
 * Risk skoru, akran karşılaştırması ve özel not yok.
 */
export default async function ParentAnalizPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const session = await requirePanelRole("PARENT");
  const flags = getPanelFeatureFlags();
  if (!flags.progressInsights) notFound();

  const { studentId } = await searchParams;
  const { children, selected } = await resolveParentScope(session.userId, studentId);

  const shell = (body: React.ReactNode) => (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle={PANEL_DOMAIN.analiz}
      topbarSlot={
        <ChildSwitcher
          options={children}
          selectedId={selected?.id ?? null}
          basePath="/panel/veli/analiz"
        />
      }
    >
      <div className="max-w-[1000px]">{body}</div>
    </PanelShell>
  );

  if (!selected) {
    return shell(
      <>
        <GidisatHero
          title="Analiz"
          periodLabel="Gidişat"
          sentences={["Hesabınız öğrencinizle eşleştirildiğinde gidişat özeti burada açılır."]}
        />
        <PanelEmpty
          title="Henüz bağlı öğrenci yok."
          body="Hesabınız öğrencinizle eşleştirildiğinde gelişim özeti burada açılır."
        />
      </>,
    );
  }

  const hasExamAccess =
    selected.products.includes("OD") || selected.products.includes("ODK");

  const parentBundle = await loadStudentProgressInsight({
    studentProfileId: selected.id,
    audience: "parent_calm",
    includeExams: hasExamAccess,
  });

  if (!parentBundle) {
    return shell(
      <PanelEmpty
        title="Özet hazırlanıyor."
        body="Öğrenci verileri göründüğünde analiz burada açılır."
      />,
    );
  }

  return shell(
    <>
      <GidisatHero
        title={`${selected.name} · gidişatı`}
        periodLabel={formatPeriodRangeLabel(parentBundle.period)}
        sentences={parentBundle.narrative}
      />

      {!hasExamAccess ? (
        <div className="mt-6 max-w-[760px] rounded-[14px] border border-dashed border-[#CBD6D0] bg-white p-[22px]">
          <h2 className="text-[16px] font-bold text-dc-ink">
            Deneme eğilimi için deneme kaydı gerekir
          </h2>
          <p className="mt-2 text-[14px] leading-[1.6] text-dc-ink-muted">
            Bu hesapta deneme ürünü yok. Aşağıda ders katılımı ve çalışma tamamlama görünüyor.
          </p>
        </div>
      ) : null}

      {parentBundle.isEmpty ? (
        <PanelEmpty
          title="Henüz gösterilecek veri yok."
          body="Ders katılımı, çalışmalar ve denemeler biriktikçe gidişat burada oluşur."
        />
      ) : (
        <>
          {hasExamAccess ? (
            <AcademicBlock
              academic={parentBundle.academic}
              emptyTitle="Grafik için en az iki deneme gerekiyor."
              emptyBody="İkinci deneme sonucu girildiğinde gelişim eğrisi burada açılır."
            />
          ) : null}
          <BehavioralBlock behavioral={parentBundle.behavioral} />
        </>
      )}
    </>,
  );
}
