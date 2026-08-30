import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { resolveParentScope } from "@/lib/panel/parent-scope";
import { productLabel } from "@/lib/auth/roles";
import { PanelShell } from "@/components/panel/panel-shell";
import { ChildSwitcher } from "@/components/panel/parent/child-switcher";
import { PanelHeading, PanelEmpty } from "@/components/panel/ui";
import { MockExamWorkspace } from "@/components/panel/mock-exam-workspace";
import { mockExamViewInclude, toMockExamView } from "@/lib/mock-exam-view";
import { withParentStudentContext } from "@/lib/parent-home-summary";

export const dynamic = "force-dynamic";

/**
 * VELİ · DENEMELER — onaylı tasarım (Panel.dc.html → pExam).
 *
 * Bu ekran tasarım geçişinde geride kalmıştı: eski `--site-*` token'ları,
 * kendi öğrenci seçicisi ve kendi veli-çocuk çözümü vardı. Artık panelin
 * ortak parçalarını kullanır — `resolveParentScope` (güvenlik sınırı tek
 * yerde), topbar'daki `ChildSwitcher` ve dc token'ları.
 *
 * ÜRÜN ERİŞİMİ: tasarımın en önemli davranışı burada. Seçili çocuğun deneme
 * ürünü yoksa ekran boş bırakılmaz; tasarımdaki kesikli çerçeveli dürüst
 * durum ve "Hesap ve pakete git" yolu gösterilir. Erişim kontrolü ÇOCUĞUN
 * kendi üyeliğinden gelir, velinin toplamından değil.
 *
 * Deneme analizi `MockExamWorkspace` ile korunur (`canCreate={false}` —
 * veli kayıt oluşturmaz, yalnız okur).
 */

export default async function ParentMockExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const session = await requirePanelRole("PARENT");
  if (!getPanelFeatureFlags().mockExamAnalysis) notFound();

  const { studentId } = await searchParams;
  const { children, selected } = await resolveParentScope(session.userId, studentId);

  const shell = (body: React.ReactNode) => (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Denemeler"
      topbarSlot={
        <ChildSwitcher
          options={children}
          selectedId={selected?.id ?? null}
          basePath="/panel/veli/denemeler"
        />
      }
    >
      <div className="max-w-[1000px]">{body}</div>
    </PanelShell>
  );

  if (!selected) {
    return shell(
      <>
        <PanelHeading title="Denemeler" />
        <PanelEmpty
          title="Öğrenci bağlantın hazırlanıyor."
          body="Bağlantı kurulduğunda çocuğunun deneme özeti burada görünür."
        />
      </>,
    );
  }

  const products = selected.products;
  /* Deneme analizi OD ürününün bir parçası; Deneme Kulübüm ayrı üründür. */
  const canSeeExams = products.includes("OD") || products.includes("ODK");

  /*
   * Başlıkta ÇOCUĞUN ADI durur. Tasarımın başlığı yalnız "Denemeler" ama
   * `ChildSwitcher` tek çocuklu velide hiç basılmıyor; o durumda ekranda
   * kimin verisine bakıldığı hiçbir yerde yazmaz. Veli panelinde bu kabul
   * edilemez (§23 — hangi öğrencinin verisi olduğu her ekranda açık kalmalı),
   * o yüzden ad üst etikete alındı.
   */
  const heading = (
    <PanelHeading
      eyebrow={selected.name}
      title="Denemeler"
      description={
        products.length
          ? `Ürün erişimi: ${products.map(productLabel).join(" · ")}`
          : "Bu öğrencide aktif ürün yok."
      }
    />
  );

  if (!canSeeExams) {
    return shell(
      <>
        {heading}
        <section className="mt-6 max-w-[700px] rounded-[14px] border border-dashed border-[#CBD6D0] bg-white p-6">
          <h2 className="text-[17px] font-bold text-dc-ink">
            Bu öğrencide deneme üyeliği yok
          </h2>
          <p className="mt-2 text-[14.5px] leading-[1.65] text-dc-ink-muted">
            Deneme Kulübüm eklendiğinde denemeler, sonuç dağılımı ve gelişim
            karşılaştırması bu ekranda görünür.
          </p>
          <Link
            href={withParentStudentContext("/panel/veli/hesap", selected.id)}
            className="mt-4 inline-block rounded-[10px] border border-[#DDE4E0] bg-white px-[18px] py-[11px] text-[13.5px] font-bold text-dc-ink transition-colors hover:border-dc-brand"
          >
            Hesap ve pakete git
          </Link>
        </section>
      </>,
    );
  }

  const exams = await prisma.mockExam.findMany({
    where: { studentId: selected.id },
    orderBy: { takenAt: "desc" },
    take: 30,
    include: mockExamViewInclude,
  });

  return shell(
    <>
      {heading}
      {exams.length === 0 ? (
        <PanelEmpty
          title="Henüz kayıtlı deneme yok."
          body="Öğretmen veya koç bir deneme sonucu girdiğinde net dağılımı ve gelişim burada görünür."
        />
      ) : (
        <div className="mt-7">
          <MockExamWorkspace
            role={session.role}
            students={[{ id: selected.id, name: selected.name }]}
            initialExams={exams.map(toMockExamView)}
            canCreate={false}
          />
        </div>
      )}
    </>,
  );
}
