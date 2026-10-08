import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { resolveParentScope } from "@/lib/panel/parent-scope";
import { productLabel } from "@/lib/auth/roles";
import { PanelShell } from "@/components/panel/panel-shell";
import { ChildContext } from "@/components/panel/parent/child-context";
import { EmptyState, PanelHeading, buttonClass } from "@/components/panel/ui";
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
 * yerde), başlıktaki öğrenci bağlamı (`ChildContext`) ve panel token'ları.
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
  const { children, selected } = await resolveParentScope(
    session.userId,
    studentId,
  );
  // Hangi çocuğun verisine bakıldığı başlığın özellik satırında (§9.7).
  const childContext = <ChildContext options={children} selectedId={selected?.id ?? null} basePath="/panel/veli/denemeler" />;

  const shell = (body: React.ReactNode) => (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Denemeler"
    >
      <div className="max-w-[1000px]">{body}</div>
    </PanelShell>
  );

  if (!selected) {
    return shell(
      <>
        <PanelHeading title="Denemeler" />
        <EmptyState
          className="mt-6"
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
   * Başlığın özellik satırında ÇOCUĞUN ADI durur (tek çocuklu velide de):
   * hangi öğrencinin verisine bakıldığı her ekranda açık kalmalı (§23, §9.7).
   */
  const heading = (
    <PanelHeading
      metadata={childContext}
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
        <EmptyState
          className="mt-6 max-w-[700px]"
          title="Bu öğrencide deneme üyeliği yok"
          body="Deneme Ligi eklendiğinde denemeler, sonuç dağılımı ve gelişim karşılaştırması bu ekranda görünür."
          action={
            <Link
              href={withParentStudentContext("/panel/veli/hesap", selected.id)}
              className={buttonClass("secondary", "md")}
            >
              Hesap ve pakete git
            </Link>
          }
        />
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
        <EmptyState
          className="mt-6"
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
