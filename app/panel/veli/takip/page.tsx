import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/auth/guards";
import { resolveParentScope } from "@/lib/panel/parent-scope";
import { PanelShell } from "@/components/panel/panel-shell";
import { ChildSwitcher } from "@/components/panel/parent/child-switcher";
import { PanelHeading, PanelStatCard, PanelEmpty } from "@/components/panel/ui";
import { NetTrendCard, type TrendPoint } from "@/components/panel/student/home-cards";

export const dynamic = "force-dynamic";

/**
 * VELİ · GELİŞİM — onaylı tasarım (Panel.dc.html → pProg).
 *
 * Tasarımın işlev tanımı: üstte çocuğun ürün erişimi, ODK varsa toplam net
 * grafiği + üç sayı kartı; ODK yoksa "deneme grafiği için Deneme Kulübüm
 * gerekiyor" kesik çizgili durumu ve yalnız katılım/ödev kartları.
 */

const PRODUCT_LABEL: Record<string, string> = {
  OD: "Online Dershanem",
  ODK: "Online Deneme Kulübüm",
};

const net = (s: { correctCount: number; incorrectCount: number }) =>
  s.correctCount - s.incorrectCount / 4;

export default async function ParentProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const session = await requirePanelRole("PARENT");
  const { studentId } = await searchParams;
  const { children, selected } = await resolveParentScope(session.userId, studentId);

  const shell = (body: React.ReactNode) => (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Gelişim"
      topbarSlot={
        <ChildSwitcher
          options={children}
          selectedId={selected?.id ?? null}
          basePath="/panel/veli/takip"
        />
      }
    >
      <div className="max-w-[1000px]">{body}</div>
    </PanelShell>
  );

  if (!selected) {
    return shell(
      <>
        <PanelHeading title="Gelişim" />
        <PanelEmpty
          title="Henüz bağlı öğrenci yok."
          body="Hesabınız öğrencinizle eşleştirildiğinde gelişim özeti burada açılır."
        />
      </>,
    );
  }

  const hasODK = selected.products.includes("ODK");

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: selected.id, endedAt: null },
    select: { groupId: true },
  });
  const groupIds = enrollments.map((e) => e.groupId);

  const [attendance, assignments, exams, plan] = await Promise.all([
    prisma.attendance.findMany({
      where: { studentId: selected.id },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    groupIds.length
      ? prisma.assignment.findMany({
          where: { isActive: true, groupId: { in: groupIds } },
          include: { progress: { where: { studentId: selected.id }, select: { status: true } } },
        })
      : Promise.resolve([]),
    hasODK
      ? prisma.mockExam.findMany({
          where: { studentId: selected.id },
          orderBy: { takenAt: "asc" },
          take: 6,
          include: { sections: true },
        })
      : Promise.resolve([]),
    prisma.weeklyPlan.findFirst({
      where: { studentId: selected.id },
      orderBy: { weekStart: "desc" },
      include: { tasks: { select: { status: true } } },
    }),
  ]);

  const attended = attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
  const doneAssignments = assignments.filter((a) => a.progress[0]?.status === "DONE").length;
  const assignmentPct = assignments.length
    ? Math.round((doneAssignments / assignments.length) * 100)
    : null;
  const planDone = plan?.tasks.filter((t) => t.status === "DONE").length ?? 0;
  const planTotal = plan?.tasks.length ?? 0;
  const planPct = planTotal ? Math.round((planDone / planTotal) * 100) : null;

  const trend: TrendPoint[] = exams.map((exam, i) => ({
    label: `D${i + 1}`,
    net: Number(exam.sections.reduce((s, x) => s + net(x), 0).toFixed(2)),
  }));

  const caption =
    trend.length >= 2
      ? `Toplam net ${trend[0].net.toLocaleString("tr-TR")} → ${trend[trend.length - 1].net.toLocaleString("tr-TR")}. Karşılaştırma yalnızca öğrencinin kendi geçmiş denemeleriyle yapılır.`
      : "";

  return shell(
    <>
      <PanelHeading
        title={`${selected.name} · gelişimi`}
        description={`Ürün erişimi: ${
          selected.products.length
            ? selected.products.map((p) => PRODUCT_LABEL[p] ?? p).join(" · ")
            : "tanımlı ürün yok"
        }`}
      />

      {!hasODK ? (
        <div className="mt-6 max-w-[760px] rounded-[14px] border border-dashed border-[#CBD6D0] bg-white p-[22px]">
          <h2 className="text-[16px] font-bold text-dc-ink">
            Deneme grafiği için Deneme Kulübüm gerekiyor
          </h2>
          <p className="mt-2 text-[14px] leading-[1.6] text-dc-ink-muted">
            Bu hesapta deneme ürünü yok. Aşağıda ders katılımı ve çalışma tamamlama görünüyor.
          </p>
        </div>
      ) : trend.length >= 2 ? (
        <NetTrendCard points={trend} caption={caption} />
      ) : (
        <PanelEmpty
          title="Grafik için en az iki deneme gerekiyor."
          body="İkinci deneme sonucu girildiğinde gelişim eğrisi burada açılır."
        />
      )}

      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {attendance.length ? (
          <PanelStatCard
            title="Ders katılımı"
            value={`${attended} / ${attendance.length}`}
            note={`Son ${attendance.length} ders`}
          />
        ) : null}
        {assignmentPct !== null ? (
          <PanelStatCard
            title="Çalışma tamamlama"
            value={`%${assignmentPct}`}
            progressPct={assignmentPct}
            note={`${doneAssignments} / ${assignments.length} çalışma`}
          />
        ) : null}
        {planPct !== null ? (
          <PanelStatCard
            title="Plan tamamlama"
            value={`%${planPct}`}
            progressPct={planPct}
            note={`${planDone} / ${planTotal} görev`}
          />
        ) : null}
        {hasODK && exams.length ? (
          <PanelStatCard title="Deneme sayısı" value={String(exams.length)} />
        ) : null}
      </div>
    </>,
  );
}
