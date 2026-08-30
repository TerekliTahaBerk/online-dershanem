import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/auth/guards";
import { resolveParentScope } from "@/lib/panel/parent-scope";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { ChildSwitcher } from "@/components/panel/parent/child-switcher";
import { PanelHeading, PanelEmpty, PanelCard, PanelMetric, PanelActionRow } from "@/components/panel/ui";
import {
  buildParentHomeHero,
  buildParentSecondaryMetrics,
  withParentStudentContext,
} from "@/lib/parent-home-summary";

export const dynamic = "force-dynamic";

/**
 * VELİ · ANA SAYFA — sakin durum + tek aksiyon.
 *
 * VELİ PANELİ ÖĞRENCİ PANELİNİN KOPYASI DEĞİLDİR (§23): burada görev
 * tamamlama, katılım ve eğilim özetlenir; öğretmenin öğrenciye özel notu ve
 * koçluk görüşme notları GÖSTERİLMEZ.
 *
 * WeeklyDigest varsa birincil kaynak odur; katılım/plan/son deneme metrikleri
 * ikincil sırada sunulur.
 */

const net = (s: { correctCount: number; incorrectCount: number }) =>
  s.correctCount - s.incorrectCount / 4;

export default async function ParentHomePage({
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
      pageTitle="Ana Sayfa"
      topbarSlot={
        <ChildSwitcher options={children} selectedId={selected?.id ?? null} basePath="/panel/veli" />
      }
    >
      <div className="max-w-[1040px]">{body}</div>
    </PanelShell>
  );

  if (!selected) {
    return shell(
      <>
        <PanelHeading title="Öğrenci bağlantınız hazırlanıyor." />
        <PanelEmpty
          title="Henüz bağlı öğrenci yok."
          body="Yönetim ekibi hesabınızı öğrencinizle eşleştirdiğinde ders, plan ve deneme özeti burada açılır."
        />
      </>,
    );
  }

  const hasOK = selected.products.includes("OK");
  const hasExamAccess = selected.products.includes("OD") || selected.products.includes("ODK");
  const calmDigestEnabled = getPanelFeatureFlags().parentWeeklyDigest;

  const [attendance, plan, latestExam, digest] = await Promise.all([
    prisma.attendance.findMany({
      where: { studentId: selected.id },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    hasOK
      ? prisma.weeklyPlan.findFirst({
          where: { studentId: selected.id },
          orderBy: { weekStart: "desc" },
          include: { tasks: { select: { status: true } } },
        })
      : Promise.resolve(null),
    hasExamAccess
      ? prisma.mockExam.findFirst({
          where: { studentId: selected.id },
          orderBy: { takenAt: "desc" },
          include: { sections: true },
        })
      : Promise.resolve(null),
    calmDigestEnabled
      ? prisma.weeklyDigest.findFirst({
          where: { status: "PUBLISHED", studentId: selected.id },
          orderBy: { weekStart: "desc" },
        })
      : Promise.resolve(null),
  ]);

  const attended = attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
  const planDone = plan?.tasks.filter((t) => t.status === "DONE").length ?? 0;
  const planTotal = plan?.tasks.length ?? 0;

  const latestNet = latestExam ? latestExam.sections.reduce((sum, section) => sum + net(section), 0) : null;
  const hero = buildParentHomeHero({
    digest: digest
      ? {
          trendBand: digest.trendBand,
          goodThingOne: digest.goodThingOne,
          goodThingTwo: digest.goodThingTwo,
          supportArea: digest.supportArea,
          homeQuestion: digest.homeQuestion,
        }
      : null,
    digestEnabled: calmDigestEnabled,
    hasCoaching: hasOK,
    coachingHref: withParentStudentContext("/panel/veli/kocluk", selected.id),
  });
  const metrics = buildParentSecondaryMetrics({
    attendanceTotal: attendance.length,
    attendanceAttended: attended,
    planDone,
    planTotal,
    latestExamNet: latestNet,
  });

  return shell(
    <>
      <PanelHeading title={`${selected.name} · durum özeti`} />

      <PanelCard className="mt-6 max-w-[860px] py-6">
        <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-dc-ink-faint">
          Haftalık durum
        </p>
        <h2 className="mt-2 text-[26px] font-extrabold leading-[1.22] tracking-[-0.02em] text-dc-ink">
          {hero.title}
        </h2>
        <p className="mt-2 text-[14.5px] leading-[1.65] text-[var(--pd-ink-3)]">{hero.description}</p>
        <div className="mt-4 rounded-[10px] border border-dc-line-soft bg-dc-surface-soft px-4 py-3">
          <p className="text-[12px] font-bold text-dc-ink-faint">{hero.actionLabel}</p>
          <p className="mt-1 text-[14px] font-semibold text-dc-ink">{hero.actionText}</p>
          {hero.ctaHref && hero.ctaLabel ? (
            <PanelActionRow
              className="mt-3"
              secondaryAction={
                <Link href={hero.ctaHref} className="panel-quick-action">
                  {hero.ctaLabel}
                </Link>
              }
            />
          ) : null}
        </div>
      </PanelCard>

      <PanelCard className="mt-5 max-w-[860px] py-5">
        <h2 className="text-[15.5px] font-bold text-dc-ink">Detay metrikler</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <PanelMetric label="Derse katılım" value={metrics.attendance} tone="neutral" />
          <PanelMetric label="Plan tamamlama" value={metrics.planCompletion} tone="neutral" />
          <PanelMetric label="Son deneme" value={metrics.lastExam} tone="neutral" />
        </div>
      </PanelCard>
    </>,
  );
}
