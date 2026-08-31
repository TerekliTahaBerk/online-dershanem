import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  PanelCard,
  PanelCardTitle,
  PanelPageHeader,
  PanelStatusBadge,
  PanelActionRow,
  PanelMetric,
} from "@/components/panel/ui";
import { evaluateCronHeartbeats } from "@/lib/jobs/health";
import { istanbulDayStart, istanbulNextDayStart } from "@/lib/istanbul-time";
import { OD_ONBOARDING_NEXT_ACTION } from "@/lib/od/onboarding-state";
import { deriveUnifiedOperationItems } from "@/lib/panel/operations-inbox";

export const dynamic = "force-dynamic";

const COMPACT_WHEN = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

type AdminExceptionSeverity = "BLOCKING" | "ACTION_REQUIRED" | "WATCH";

type AdminExceptionItem = {
  id: string;
  source: "commerce" | "education" | "system";
  severity: AdminExceptionSeverity;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  createdAt?: Date | null;
};

type ExceptionSectionProps = {
  title: string;
  items: AdminExceptionItem[];
  emptyText: string;
};

const severityPresentation: Record<AdminExceptionSeverity, { label: string; tone: "critical" | "warning" | "neutral"; rank: number }> = {
  BLOCKING: {
    label: "Bloke",
    tone: "critical",
    rank: 0,
  },
  ACTION_REQUIRED: {
    label: "Aksiyon gerekli",
    tone: "warning",
    rank: 1,
  },
  WATCH: {
    label: "İzle",
    tone: "neutral",
    rank: 2,
  },
};

function formatAge(from: Date, now: Date): string {
  const diffMs = Math.max(0, now.getTime() - from.getTime());
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa`;
  const days = Math.floor(hours / 24);
  return `${days} gün`;
}

function byPriorityThenAge(a: AdminExceptionItem, b: AdminExceptionItem): number {
  const rankDiff = severityPresentation[a.severity].rank - severityPresentation[b.severity].rank;
  if (rankDiff !== 0) return rankDiff;
  const aTime = a.createdAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const bTime = b.createdAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return aTime - bTime;
}

function ExceptionSection({ title, items, emptyText }: ExceptionSectionProps) {
  return (
    <PanelCard>
      <PanelCardTitle>{title}</PanelCardTitle>
      {items.length === 0 ? (
        <p className="mt-3 text-[13.5px] text-dc-ink-muted">{emptyText}</p>
      ) : (
        <div className="mt-3.5 rounded-[10px] border border-dc-line-soft bg-white">
          {items.map((item, index) => (
            <PanelActionRow
              key={item.id}
              title={item.title}
              description={item.description}
              status={
                <PanelStatusBadge
                  label={severityPresentation[item.severity].label}
                  tone={severityPresentation[item.severity].tone}
                />
              }
              cta={
                <Link href={item.href} className="panel-quick-action inline-flex">
                  {item.ctaLabel}
                </Link>
              }
              last={index === items.length - 1}
            />
          ))}
        </div>
      )}
    </PanelCard>
  );
}

export default async function AdminHomePage() {
  const session = await requireRole("ADMIN");

  const now = new Date();
  const dayStart = istanbulDayStart(now);
  const dayEnd = istanbulNextDayStart(now);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    manualReviewCount,
    manualReviewOrders,
    pendingProvisioningCount,
    pendingProvisioningOrders,
    retryPendingCount,
    retryPendingOrders,
    odCount,
    odkCount,
    onboardingSignals,
    cancelledLessonsForInbox,
  ] = await Promise.all([
    prisma.odOrder.count({ where: { status: "PAID", provisioningStatus: "MANUAL_REVIEW" } }),
    prisma.odOrder.findMany({
      where: { status: "PAID", provisioningStatus: "MANUAL_REVIEW" },
      orderBy: { updatedAt: "asc" },
      take: 4,
      select: {
        id: true,
        packageName: true,
        updatedAt: true,
        user: { select: { fullName: true, email: true } },
      },
    }),
    prisma.odOrder.count({
      where: { status: "PAID", provisioningStatus: { in: ["PENDING", "RUNNING"] } },
    }),
    prisma.odOrder.findMany({
      where: { status: "PAID", provisioningStatus: { in: ["PENDING", "RUNNING"] } },
      orderBy: { updatedAt: "asc" },
      take: 3,
      select: {
        id: true,
        packageName: true,
        updatedAt: true,
        user: { select: { fullName: true, email: true } },
      },
    }),
    prisma.odOrder.count({ where: { status: "PAID", provisioningStatus: "RETRY_PENDING" } }),
    prisma.odOrder.findMany({
      where: { status: "PAID", provisioningStatus: "RETRY_PENDING" },
      orderBy: { updatedAt: "asc" },
      take: 3,
      select: {
        id: true,
        packageName: true,
        updatedAt: true,
        user: { select: { fullName: true, email: true } },
      },
    }),
    prisma.productMembership.count({ where: { product: "OD", revokedAt: null } }),
    prisma.productMembership.count({ where: { product: "ODK", revokedAt: null } }),
    prisma.odOnboarding.findMany({
      where: { order: { status: "PAID" }, state: { not: "ACTIVE" } },
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
      take: 60,
      select: {
        id: true,
        orderId: true,
        state: true,
        dueAt: true,
        blockerReason: true,
        stateEnteredAt: true,
        owner: { select: { fullName: true, email: true } },
        order: {
          select: {
            packageName: true,
            user: {
              select: {
                fullName: true,
                email: true,
                studentProfile: {
                  select: {
                    id: true,
                    parents: { select: { id: true }, take: 1 },
                    enrollments: {
                      where: { endedAt: null },
                      select: {
                        group: { select: { lessons: { where: { status: "PLANNED" }, select: { id: true }, take: 1 } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.lesson.findMany({
      where: { status: "CANCELLED", startsAt: { gte: dayStart, lt: dayEnd } },
      orderBy: { startsAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        startsAt: true,
        group: {
          select: {
            name: true,
            lessons: { where: { status: "PLANNED", startsAt: { gt: now } }, select: { id: true }, take: 1 },
            teacher: { select: { fullName: true, email: true } },
          },
        },
      },
    }),
  ]);

  const optionalResults = await Promise.allSettled([
    prisma.lesson.findMany({
      where: { startsAt: { gte: dayStart, lt: dayEnd } },
      select: { id: true, status: true, startsAt: true, group: { select: { name: true } } },
    }),
    prisma.lesson.count({
      where: { startsAt: { lt: now, gte: weekAgo }, notes: { none: { studentId: null } } },
    }),
    prisma.weeklyPlan.count({ where: { status: "DRAFT", weekStart: { lt: weekAgo } } }),
    prisma.cronHeartbeat.findMany(),
    prisma.user.findMany({
      where: { role: "TEACHER", status: "ACTIVE" },
      select: {
        id: true,
        fullName: true,
        email: true,
        taughtGroups: {
          where: { isActive: true },
          select: { enrollments: { where: { endedAt: null }, select: { id: true } } },
        },
      },
    }),
    prisma.$transaction([
      prisma.user.count({ where: { status: "SUSPENDED" } }),
      prisma.user.count({ where: { role: "STUDENT", studentProfile: null } }),
      prisma.user.count({ where: { role: "TEACHER", teacherProfile: null } }),
      prisma.user.count({
        where: {
          OR: [
            { taughtGroups: { some: {} } },
            { taughtLessons: { some: {} } },
            { createdAssignments: { some: {} } },
            { createdMaterials: { some: {} } },
            { createdMockExams: { some: {} } },
            { odkExamAttempts: { some: {} } },
          ],
        },
      }),
    ]),
  ]);

  const todayLessons = optionalResults[0].status === "fulfilled" ? optionalResults[0].value : null;
  const unnotedLessons = optionalResults[1].status === "fulfilled" ? optionalResults[1].value : null;
  const stalePlans = optionalResults[2].status === "fulfilled" ? optionalResults[2].value : null;
  const cronHealth =
    optionalResults[3].status === "fulfilled"
      ? evaluateCronHeartbeats(optionalResults[3].value, now)
      : null;
  const teachers = optionalResults[4].status === "fulfilled" ? optionalResults[4].value : null;
  const accountSignals = optionalResults[5].status === "fulfilled"
    ? {
        suspendedUsers: optionalResults[5].value[0],
        studentsWithoutProfile: optionalResults[5].value[1],
        teachersWithoutProfile: optionalResults[5].value[2],
        deleteRiskUsers: optionalResults[5].value[3],
      }
    : null;

  const hasOptionalDataFailure = optionalResults.some((result) => result.status === "rejected");
  const cancelledToday = todayLessons?.filter((lesson) => lesson.status === "CANCELLED") ?? [];
  const unifiedOpenItems = deriveUnifiedOperationItems({
    now,
    onboardings: onboardingSignals.map((item) => {
      const profile = item.order.user?.studentProfile;
      const hasParent = Boolean(profile?.parents.length);
      const hasGroup = Boolean(profile?.enrollments.length);
      const hasFirstLesson = Boolean(profile?.enrollments.some((enrollment) => enrollment.group.lessons.length));
      return {
        id: item.id,
        orderId: item.orderId,
        packageName: item.order.packageName,
        state: item.state,
        blockerReason: item.blockerReason,
        ownerName: item.owner?.fullName || item.owner?.email || null,
        dueAt: item.dueAt,
        stateEnteredAt: item.stateEnteredAt,
        studentLabel: item.order.user?.fullName || item.order.user?.email || "hesap bağlantısı bekleniyor",
        hasAccount: Boolean(profile),
        hasParent,
        hasGroup,
        hasFirstLesson,
        studentProfileId: profile?.id || null,
        nextAction: OD_ONBOARDING_NEXT_ACTION[item.state],
      };
    }),
    cancelledLessons: cancelledLessonsForInbox.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      startsAt: lesson.startsAt,
      groupName: lesson.group.name,
      teacherName: lesson.group.teacher.fullName || lesson.group.teacher.email,
      hasFollowUpLesson: lesson.group.lessons.length > 0,
    })),
  }).filter((item) => item.resolution === "OPEN");

  const exceptions: AdminExceptionItem[] = [];
  const seenOrderIds = new Set<string>();

  if (unifiedOpenItems.length > 0) {
    const blockingCount = unifiedOpenItems.filter((item) => item.severity === "BLOCKING").length;
    exceptions.push({
      id: "unified-operations-open",
      source: "system",
      severity: blockingCount > 0 ? "BLOCKING" : "ACTION_REQUIRED",
      title: `${unifiedOpenItems.length} operasyon istisnası çözüm bekliyor`,
      description: `${blockingCount} bloke · tek operasyon kuyruğundan sahip/son tarih takibi yapın`,
      href: "/panel/yonetim/isler",
      ctaLabel: "Operasyonu Aç",
      createdAt: unifiedOpenItems[0]?.createdAt,
    });
  }

  for (const order of manualReviewOrders) {
    const owner = order.user?.fullName || order.user?.email || "hesap bağlantısı bekleniyor";
    exceptions.push({
      id: `manual-${order.id}`,
      source: "commerce",
      severity: "BLOCKING",
      title: `${order.packageName} · erişim açma başarısız`,
      description: `${owner} · ${COMPACT_WHEN.format(order.updatedAt)} · ${formatAge(order.updatedAt, now)} açık`,
      href: `/panel/yonetim/siparisler/${order.id}`,
      ctaLabel: "Siparişi Aç",
      createdAt: order.updatedAt,
    });
    seenOrderIds.add(order.id);
  }

  for (const order of pendingProvisioningOrders) {
    if (seenOrderIds.has(order.id)) continue;
    const owner = order.user?.fullName || order.user?.email || "hesap bağlantısı bekleniyor";
    exceptions.push({
      id: `pending-${order.id}`,
      source: "commerce",
      severity: "ACTION_REQUIRED",
      title: `${order.packageName} · provisioning tamamlanmadı`,
      description: `${owner} · ${COMPACT_WHEN.format(order.updatedAt)} · ${formatAge(order.updatedAt, now)} açık`,
      href: `/panel/yonetim/siparisler/${order.id}`,
      ctaLabel: "Siparişi Aç",
      createdAt: order.updatedAt,
    });
    seenOrderIds.add(order.id);
  }

  for (const order of retryPendingOrders) {
    if (seenOrderIds.has(order.id)) continue;
    const owner = order.user?.fullName || order.user?.email || "hesap bağlantısı bekleniyor";
    exceptions.push({
      id: `retry-${order.id}`,
      source: "commerce",
      severity: "WATCH",
      title: `${order.packageName} · provisioning yeniden denenecek`,
      description: `${owner} · ${COMPACT_WHEN.format(order.updatedAt)} · ${formatAge(order.updatedAt, now)} açık`,
      href: `/panel/yonetim/siparisler/${order.id}`,
      ctaLabel: "İşi İncele",
      createdAt: order.updatedAt,
    });
    seenOrderIds.add(order.id);
  }

  if (manualReviewCount > manualReviewOrders.length) {
    exceptions.push({
      id: "manual-overflow",
      source: "commerce",
      severity: "BLOCKING",
      title: `${manualReviewCount - manualReviewOrders.length} siparişte daha manuel inceleme bekleniyor`,
      description: "Tümünü görmek için ticaret işlerine gidin.",
      href: "/panel/yonetim/siparisler?filtre=sorun",
      ctaLabel: "Tümünü Aç",
    });
  }

  if (pendingProvisioningCount > pendingProvisioningOrders.length) {
    exceptions.push({
      id: "pending-overflow",
      source: "commerce",
      severity: "ACTION_REQUIRED",
      title: `${pendingProvisioningCount - pendingProvisioningOrders.length} siparişte erişim açma bekliyor`,
      description: "Ödeme doğrulandı, provisioning süreci tamamlanmadı.",
      href: "/panel/yonetim/siparisler?filtre=sorun",
      ctaLabel: "Siparişleri Aç",
    });
  }

  if (retryPendingCount > retryPendingOrders.length) {
    exceptions.push({
      id: "retry-overflow",
      source: "commerce",
      severity: "WATCH",
      title: `${retryPendingCount - retryPendingOrders.length} siparişte otomatik retry sürüyor`,
      description: "Süreç kapanmazsa ticaret işlerinden manuel takip edin.",
      href: "/panel/yonetim/isler",
      ctaLabel: "Operasyonu Aç",
    });
  }

  if (cancelledToday.length > 0) {
    const sample = cancelledToday
      .slice(0, 2)
      .map((lesson) => `${lesson.group.name} ${COMPACT_WHEN.format(lesson.startsAt).split("·")[1]?.trim() ?? ""}`)
      .filter(Boolean)
      .join(", ");
    exceptions.push({
      id: "cancelled-lessons",
      source: "education",
      severity: "ACTION_REQUIRED",
      title: `Bugün ${cancelledToday.length} ders iptal edildi`,
      description: sample || "Etkilenen dersleri takvimde açın.",
      href: "/panel/yonetim/takvim",
      ctaLabel: "Takvimi Aç",
    });
  }

  if ((unnotedLessons ?? 0) > 0) {
    exceptions.push({
      id: "unnoted-lessons",
      source: "education",
      severity: "WATCH",
      title: `${unnotedLessons} ders için not girişi bekleniyor`,
      description: "Tamamlanmış derslerde içerik kanıtı eksik.",
      href: "/panel/yonetim/egitim",
      ctaLabel: "Eğitimi Aç",
    });
  }

  if ((stalePlans ?? 0) > 0) {
    exceptions.push({
      id: "stale-plans",
      source: "education",
      severity: "WATCH",
      title: `${stalePlans} haftalık plan uzun süredir taslak`,
      description: "Koçluk planı kapanışlarını kontrol edin.",
      href: "/panel/yonetim/kocluk",
      ctaLabel: "Koçluğu Aç",
    });
  }

  if (accountSignals) {
    if (accountSignals.studentsWithoutProfile + accountSignals.teachersWithoutProfile > 0) {
      exceptions.push({
        id: "account-profile-mismatch",
        source: "system",
        severity: "ACTION_REQUIRED",
        title: `${accountSignals.studentsWithoutProfile + accountSignals.teachersWithoutProfile} hesapta rol/profil uyumsuzluğu var`,
        description: "Kişiler merkezinde veri bütünlüğü sinyallerini düzeltin.",
        href: "/panel/yonetim/kullanicilar?durum=profil",
        ctaLabel: "Kişileri Aç",
      });
    }

    if (accountSignals.deleteRiskUsers > 0) {
      exceptions.push({
        id: "account-delete-risk",
        source: "system",
        severity: "WATCH",
        title: `${accountSignals.deleteRiskUsers} hesapta geçmiş bağlı kayıt var`,
        description: "Bu hesaplar için kalıcı silme yerine askıya alma tercih edilmelidir.",
        href: "/panel/yonetim/kullanicilar",
        ctaLabel: "Kişileri Aç",
      });
    }
  }

  if (cronHealth) {
    const failed = cronHealth.jobs.filter((job) => job.status === "failed" || job.status === "missing");
    const stale = cronHealth.jobs.filter((job) => job.status === "stale");

    if (failed.length > 0) {
      exceptions.push({
        id: "cron-failed",
        source: "system",
        severity: "ACTION_REQUIRED",
        title: `${failed.length} kritik cron sağlıksız`,
        description: failed.map((job) => job.label).slice(0, 2).join(", "),
        href: "/panel/yonetim/isler#cron-durumu",
        ctaLabel: "Cron Durumunu Aç",
      });
    }

    if (stale.length > 0) {
      exceptions.push({
        id: "cron-stale",
        source: "system",
        severity: "WATCH",
        title: `${stale.length} kritik cron gecikmiş`,
        description: stale.map((job) => job.label).slice(0, 2).join(", "),
        href: "/panel/yonetim/isler#cron-durumu",
        ctaLabel: "Cron Durumunu Aç",
      });
    }
  }

  if (hasOptionalDataFailure) {
    exceptions.push({
      id: "partial-data-failure",
      source: "system",
      severity: "ACTION_REQUIRED",
      title: "Bazı operasyon kaynakları şu anda okunamıyor",
      description: "Eksik kaynaklar düzelene kadar özet eksik görünebilir.",
      href: "/panel/yonetim/isler",
      ctaLabel: "Operasyonu Aç",
    });
  }

  const prioritized = exceptions.sort(byPriorityThenAge).slice(0, 10);
  const blocking = prioritized.filter((item) => item.severity === "BLOCKING");
  const actionRequired = prioritized.filter((item) => item.severity === "ACTION_REQUIRED");
  const watch = prioritized.filter((item) => item.severity === "WATCH");

  const totalOpenOperations =
    manualReviewCount +
    pendingProvisioningCount +
    retryPendingCount +
    cancelledToday.length +
    (unnotedLessons ?? 0) +
    (stalePlans ?? 0) +
    (cronHealth ? cronHealth.jobs.filter((job) => job.status !== "healthy").length : 0);

  const capacity =
    teachers
      ?.map((teacher) => ({
        id: teacher.id,
        name: teacher.fullName || teacher.email,
        students: teacher.taughtGroups.reduce((sum, group) => sum + group.enrollments.length, 0),
        groups: teacher.taughtGroups.length,
      }))
      .filter((teacher) => teacher.groups > 0)
      .sort((a, b) => b.students - a.students)
      .slice(0, 6) ?? [];

  const maxStudents = Math.max(1, ...capacity.map((item) => item.students));
  const hasAnyException = prioritized.length > 0;

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Bugün"
    >
      <div className="max-w-[1080px]">
        <PanelPageHeader
          title="Bugün"
          description={`${totalOpenOperations} açık operasyon sinyali · önce bloke edenler`}
        />

        {!hasAnyException ? (
          <PanelCard className="mt-6">
            <PanelCardTitle>Bugün aksiyon bekleyenler</PanelCardTitle>
            <p className="mt-3 text-[14px] text-dc-ink-muted">
              Şu anda aksiyon bekleyen kritik bir işlem görünmüyor.
            </p>
            <Link
              href="/panel/yonetim/isler"
              className="mt-3 inline-block text-[13px] font-semibold text-dc-brand hover:underline"
            >
              Operasyon detaylarını incele
            </Link>
          </PanelCard>
        ) : (
          <div className="mt-6 grid gap-5">
            <ExceptionSection
              title="Acil / Bloke Edenler"
              items={blocking}
              emptyText="Bloke eden bir kayıt görünmüyor."
            />
            <ExceptionSection
              title="Bugün Aksiyon Bekleyenler"
              items={actionRequired}
              emptyText="Aksiyon gerektiren kayıt görünmüyor."
            />
            <ExceptionSection
              title="İzlenmesi Gerekenler"
              items={watch}
              emptyText="İzleme düzeyinde kayıt görünmüyor."
            />
          </div>
        )}

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <PanelCard>
            <PanelCardTitle>Kısa operasyon özeti</PanelCardTitle>
            <dl className="mt-3.5 flex flex-col gap-3 text-[14px] font-medium text-[var(--pd-ink-3)]">
              <div className="flex justify-between gap-3">
                <dt>Manuel inceleme bekleyen sipariş</dt>
                <dd className="text-dc-ink-muted">{manualReviewCount}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Provisioning bekleyen sipariş</dt>
                <dd className="text-dc-ink-muted">{pendingProvisioningCount}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Retry durumundaki sipariş</dt>
                <dd className="text-dc-ink-muted">{retryPendingCount}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Bugün planlı ders</dt>
                <dd className="text-dc-ink-muted">
                  {todayLessons ? `${todayLessons.length} planlı` : "Veri alınamadı"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Askıda hesap</dt>
                <dd className="text-dc-ink-muted">
                  {accountSignals ? accountSignals.suspendedUsers : "Veri alınamadı"}
                </dd>
              </div>
            </dl>
          </PanelCard>

          <PanelCard variant="subtle">
            <PanelCardTitle>Secondary metrics</PanelCardTitle>
            <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
              <PanelMetric label="Online Dershanem üyelik" value={odCount} tone="neutral" />
              <PanelMetric label="Online Deneme Kulübüm üyelik" value={odkCount} tone="neutral" />
            </div>
          </PanelCard>
        </div>

        <PanelCard className="mt-5">
          <PanelCardTitle>Eğitmen yükü</PanelCardTitle>
          {capacity.length ? (
            <>
              <ul className="mt-3.5 flex flex-col gap-3.5">
                {capacity.map((teacher) => {
                  const pct = Math.round((teacher.students / maxStudents) * 100);
                  return (
                    <li key={teacher.id}>
                      <div className="flex justify-between gap-3 text-[13.5px] font-medium text-[var(--pd-ink-3)]">
                        <span className="min-w-0 truncate">{teacher.name}</span>
                        <span className="shrink-0 text-dc-ink-muted">
                          {teacher.students} öğrenci · {teacher.groups} grup
                        </span>
                      </div>
                      <div
                        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-dc-line-soft"
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${teacher.name} yükü`}
                      >
                        <div className="h-full rounded-full bg-dc-brand" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-[12.5px] text-dc-ink-faint">
                Yük, aktif gruplardaki öğrenci sayısından çıkar.
              </p>
            </>
          ) : (
            <p className="mt-3 text-[14px] text-dc-ink-muted">
              Eğitmen yükü için gerekli kaynaklar şu anda okunamıyor.
            </p>
          )}
        </PanelCard>
      </div>
    </PanelShell>
  );
}
