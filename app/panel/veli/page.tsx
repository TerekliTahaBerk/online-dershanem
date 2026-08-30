import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/auth/guards";
import { resolveParentScope } from "@/lib/panel/parent-scope";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { ISTANBUL_TIME_ZONE } from "@/lib/istanbul-time";
import { getStudentCoaching } from "@/lib/panel/coaching";
import { listStudentExams } from "@/lib/odk/student-exam-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { ChildSwitcher } from "@/components/panel/parent/child-switcher";
import {
  PanelPageHeader,
  PanelEmpty,
  PanelCard,
  PanelActionRow,
  PanelStatusBadge,
  PanelMetric,
  PanelAttentionCard,
} from "@/components/panel/ui";
import {
  buildParentHomeStatus,
  buildParentSecondaryMetrics,
  withParentStudentContext,
} from "@/lib/parent-home-summary";

export const dynamic = "force-dynamic";

const net = (s: { correctCount: number; incorrectCount: number }) => s.correctCount - s.incorrectCount / 4;

const TR_DATE = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TIME_ZONE,
  day: "numeric",
  month: "long",
  weekday: "long",
});
const TR_TIME = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

function formatSchedule(date: Date): string {
  return `${TR_DATE.format(date)} · ${TR_TIME.format(date).replace(":", ".")}`;
}

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
      pageTitle="Bugün"
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
        <PanelPageHeader title="Öğrenci bağlantınız hazırlanıyor." />
        <PanelEmpty
          title="Henüz bağlı öğrenci yok."
          body="Yönetim ekibi hesabınızı öğrencinizle eşleştirdiğinde ders, plan ve deneme özeti burada açılır."
        />
      </>,
    );
  }

  const now = new Date();
  const hasOD = selected.products.includes("OD");
  const hasODK = selected.products.includes("ODK");
  const hasOK = selected.products.includes("OK");
  const hasExamAccess = selected.products.includes("OD") || selected.products.includes("ODK");
  const calmDigestEnabled = getPanelFeatureFlags().parentWeeklyDigest;

  const [attendance, plan, latestExam, digest, nextLesson, coaching, odkExams] = await Promise.all([
    hasOD
      ? prisma.attendance.findMany({
          where: { studentId: selected.id },
          orderBy: { createdAt: "desc" },
          take: 12,
        })
      : Promise.resolve([]),
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
    hasOD
      ? prisma.lesson.findFirst({
          where: {
            status: "PLANNED",
            startsAt: { gte: now },
            attendances: { some: { studentId: selected.id } },
          },
          orderBy: { startsAt: "asc" },
          include: { teacher: { select: { fullName: true } } },
        })
      : Promise.resolve(null),
    hasOK ? getStudentCoaching(selected.id) : Promise.resolve(null),
    hasODK ? listStudentExams(selected.userId) : Promise.resolve([]),
  ]);

  const attended = attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
  const planDone = plan?.tasks.filter((t) => t.status === "DONE").length ?? 0;
  const planTotal = plan?.tasks.length ?? 0;
  const latestNet = latestExam ? latestExam.sections.reduce((sum, section) => sum + net(section), 0) : null;
  const latestExamLabel = latestExam ? `${latestExam.exam} · ${TR_DATE.format(latestExam.takenAt)}` : null;

  const status = buildParentHomeStatus({
    hasOD,
    hasOK,
    hasExamAccess,
    attendanceTotal: attendance.length,
    attendanceAttended: attended,
    planDone,
    planTotal,
    latestExamNet: latestNet,
    latestExamLabel,
  });

  const metrics = buildParentSecondaryMetrics({
    hasOD,
    hasOK,
    hasExamAccess,
    attendanceTotal: attendance.length,
    attendanceAttended: attended,
    planDone,
    planTotal,
    latestExamNet: latestNet,
    latestExamLabel,
  });

  const nextOdkExam =
    odkExams.find(
      (exam) =>
        exam.attempts[0]?.status !== "IN_PROGRESS" &&
        exam.status !== "RELEASED" &&
        (!exam.endsAt || exam.endsAt > now),
    ) ?? null;

  const upcomingItems = [
    ...(nextLesson
      ? [
          {
            id: "lesson",
            title: "Sonraki canlı ders",
            value: `${nextLesson.title} · ${formatSchedule(nextLesson.startsAt)}`,
            href: withParentStudentContext("/panel/veli/takvim", selected.id),
            cta: "Ders takvimini aç",
          },
        ]
      : []),
    ...(coaching?.nextScheduledAt
      ? [
          {
            id: "coaching",
            title: "Sonraki koçluk görüşmesi",
            value: formatSchedule(coaching.nextScheduledAt),
            href: withParentStudentContext("/panel/veli/kocluk", selected.id),
            cta: "Koçluğu aç",
          },
        ]
      : []),
    ...(nextOdkExam?.startsAt
      ? [
          {
            id: "exam",
            title: "Yaklaşan deneme",
            value: `${nextOdkExam.title} · ${formatSchedule(nextOdkExam.startsAt)}`,
            href: "/panel/odk/veli/raporlar",
            cta: "Deneme raporlarını aç",
          },
        ]
      : []),
  ].slice(0, 3);

  const lessonSoon =
    nextLesson &&
    nextLesson.startsAt.getTime() >= now.getTime() &&
    nextLesson.startsAt.getTime() <= now.getTime() + 24 * 60 * 60 * 1000
      ? nextLesson
      : null;

  const parentAction =
    status.code === "LOW_DATA"
      ? {
          title: "Genel değerlendirme için veri oluşuyor",
          body: "Bu hafta görünen verileri takip etmeniz ve haftalık özeti beklemeniz yeterli.",
          ctaHref: calmDigestEnabled
            ? withParentStudentContext("/panel/veli/haftalik", selected.id)
            : undefined,
          ctaLabel: calmDigestEnabled ? "Haftalık özeti aç" : undefined,
        }
      : lessonSoon
        ? {
            title: "Yaklaşan ders saatini hatırlatın",
            body: `${formatSchedule(lessonSoon.startsAt)} dersine kısa bir hazırlık iyi olabilir.`,
            ctaHref: withParentStudentContext("/panel/veli/takvim", selected.id),
            ctaLabel: "Ders takvimini aç",
          }
        : status.needsPlanSupport && hasOK
          ? {
              title: "Haftalık planı birlikte gözden geçirin",
              body: `${Math.max(0, planTotal - planDone)} çalışma bekliyor; kısa bir çalışma saati planlamak faydalı olabilir.`,
              ctaHref: withParentStudentContext("/panel/veli/kocluk", selected.id),
              ctaLabel: "Koçluğu aç",
            }
          : coaching?.nextScheduledAt
            ? {
                title: "Koçluk görüşmesini hatırlatın",
                body: `${formatSchedule(coaching.nextScheduledAt)} için planlanan görüşme öncesi kısa bir hazırlık yapabilirsiniz.`,
                ctaHref: withParentStudentContext("/panel/veli/kocluk", selected.id),
                ctaLabel: "Koçluğu aç",
              }
            : status.hasEnoughEvidence
              ? {
                  title: "Şu an sizden beklenen bir şey yok.",
                  body: "Düzenli takibe devam etmeniz yeterli.",
                }
              : {
                  title: "Bu hafta için sınırlı veri var",
                  body: "Yeni veriler oluştukça genel durum daha net görünecek.",
                };

  const statusLabel =
    status.code === "NEEDS_ATTENTION"
      ? "Dikkat noktası"
      : status.code === "LOW_DATA"
        ? "Sınırlı veri"
        : "Yolunda";

  const digestHref = withParentStudentContext("/panel/veli/haftalik", selected.id);
  const digestSummary = digest ? `${digest.goodThingOne} ${digest.goodThingTwo}`.trim() : null;
  const showUpsell = !hasOK;
  const headingDescription = hasODK
    ? "Genel durum, sizden beklenenler ve öne çıkanlar."
    : "Genel durum, sizden beklenenler ve bu haftanın özeti.";

  return shell(
    <>
      <PanelPageHeader eyebrow={selected.name} title="Bu hafta" description={headingDescription} />

      <PanelAttentionCard
        className="mt-6 max-w-[860px]"
        tone={status.code === "NEEDS_ATTENTION" ? "warning" : "info"}
        title={`Genel durum · ${status.title}`}
        body={status.description}
        action={<PanelStatusBadge label={statusLabel} tone={status.code === "NEEDS_ATTENTION" ? "warning" : status.code === "LOW_DATA" ? "info" : "success"} />}
      />
      {status.evidence.length ? (
        <PanelCard className="mt-3 max-w-[860px]" variant="subtle">
          <ul className="space-y-2">
            {status.evidence.map((item) => (
              <li
                key={item}
                className="rounded-[10px] border border-dc-line-soft bg-white px-4 py-3 text-[13.5px] text-dc-ink-muted"
              >
                {item}
              </li>
            ))}
          </ul>
        </PanelCard>
      ) : null}

      <PanelCard className="mt-5 max-w-[860px] py-5">
        <h2 className="text-[15.5px] font-bold text-dc-ink">Sizden beklenen</h2>
        <p className="mt-2 text-[15px] font-semibold text-dc-ink">{parentAction.title}</p>
        <p className="mt-1.5 text-[14px] leading-[1.65] text-dc-ink-muted">{parentAction.body}</p>
        {parentAction.ctaHref && parentAction.ctaLabel ? (
          <PanelActionRow
            className="mt-3"
            secondaryAction={
              <Link href={parentAction.ctaHref} className="panel-quick-action">
                {parentAction.ctaLabel}
              </Link>
            }
          />
        ) : null}
      </PanelCard>

      <PanelCard className="mt-5 max-w-[860px] py-5" variant="subtle">
        <h2 className="text-[15.5px] font-bold text-dc-ink">Bu hafta</h2>
        {metrics.length ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {metrics.map((metric) => (
              <PanelMetric
                key={metric.id}
                label={metric.label}
                value={metric.value}
                description={metric.description || undefined}
                tone="neutral"
              />
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[14px] text-dc-ink-muted">
            Bu hafta için görüntülenecek kısa metrik henüz oluşmadı.
          </p>
        )}
      </PanelCard>

      <div className="mt-5 grid max-w-[860px] gap-5 lg:grid-cols-2">
        <PanelCard className="py-5" padded={false}>
          <h2 className="text-[15.5px] font-bold text-dc-ink">Yaklaşanlar</h2>
          {upcomingItems.length ? (
            <div className="mt-3 rounded-[10px] border border-dc-line-soft">
              {upcomingItems.map((item, index) => (
                <PanelActionRow
                  key={item.id}
                  title={item.title}
                  description={item.value}
                  cta={
                    <Link href={item.href} className="panel-quick-action inline-flex">
                      {item.cta}
                    </Link>
                  }
                  last={index === upcomingItems.length - 1}
                />
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[14px] text-dc-ink-muted">
              Şimdilik yaklaşan bir ders, görüşme veya deneme görünmüyor.
            </p>
          )}
        </PanelCard>

        <PanelCard className="py-5">
          <h2 className="text-[15.5px] font-bold text-dc-ink">Haftalık özet</h2>
          {calmDigestEnabled && digest ? (
            <>
              <p className="mt-2 text-[14px] leading-[1.65] text-dc-ink-muted">{digestSummary}</p>
              <Link href={digestHref} className="panel-quick-action mt-3 inline-flex">
                Haftalık Özeti Gör
              </Link>
            </>
          ) : calmDigestEnabled ? (
            <>
              <p className="mt-2 text-[14px] leading-[1.65] text-dc-ink-muted">
                Haftalık özet yayınlandığında bu alanda görünecek.
              </p>
              <Link href={digestHref} className="panel-quick-action mt-3 inline-flex">
                Haftalık Özeti Gör
              </Link>
            </>
          ) : (
            <p className="mt-2 text-[14px] leading-[1.65] text-dc-ink-muted">
              Haftalık özet bu hesapta aktif değil.
            </p>
          )}
        </PanelCard>
      </div>

      {showUpsell ? (
        <PanelCard className="mt-5 max-w-[860px] py-5">
          <h2 className="text-[15.5px] font-bold text-dc-ink">Online Koçum</h2>
          <p className="mt-2 text-[14px] leading-[1.65] text-dc-ink-muted">
            Haftalık plan ve koç görüşmeleri için Online Koçum detaylarını inceleyebilirsiniz.
          </p>
          <Link href="/panel/veli/hesap" className="panel-quick-action mt-3 inline-flex">
            Online Koçum&apos;u İncele
          </Link>
        </PanelCard>
      ) : null}
    </>,
  );
}
