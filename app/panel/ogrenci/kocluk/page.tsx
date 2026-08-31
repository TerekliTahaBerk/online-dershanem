import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireProductRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { getStudentCoaching } from "@/lib/panel/coaching";
import { getStudentGoals } from "@/lib/panel/goals";
import { formatIstanbulDateInput, ISTANBUL_TIME_ZONE } from "@/lib/istanbul-time";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  PanelCard,
  PanelCardTitle,
  PanelEmpty,
  PanelHeading,
  PanelSectionLabel,
  PanelTaskRow,
} from "@/components/panel/ui";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TIME_ZONE,
  day: "numeric",
  month: "long",
});
const DATE_TIME = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TIME_ZONE,
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});
const NUM = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

export default async function StudentCoachingHubPage() {
  const session = await requireProductRole("OK", "STUDENT");
  const adaptivePlanEnabled = getPanelFeatureFlags().adaptivePlan;

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });

  const shell = (body: React.ReactNode) => (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Koçluk merkezi"
    >
      <div className="max-w-[920px]">{body}</div>
    </PanelShell>
  );

  if (!profile) {
    return shell(
      <>
        <PanelHeading title="Koçluk merkezi" />
        <PanelEmpty
          title="Profilin hazırlanıyor."
          body="Öğrenci profilin tamamlandığında koçluk durumun burada görünecek."
        />
      </>,
    );
  }

  const [coaching, goals, plan] = await Promise.all([
    getStudentCoaching(profile.id),
    getStudentGoals(profile.id),
    prisma.weeklyPlan.findFirst({
      where: { studentId: profile.id },
      orderBy: { weekStart: "desc" },
      include: {
        tasks: {
          where: { status: { not: "SKIPPED" } },
          orderBy: [{ scheduledFor: "asc" }, { position: "asc" }],
        },
      },
    }),
  ]);

  const todayKey = formatIstanbulDateInput(new Date());
  const allTasks = plan?.tasks ?? [];
  const pending = allTasks.filter((task) => task.status === "PLANNED");
  const done = allTasks.filter((task) => task.status === "DONE");
  const todayPending = pending.filter(
    (task) => formatIstanbulDateInput(task.scheduledFor) === todayKey,
  );
  const upcomingPending = pending
    .filter((task) => formatIstanbulDateInput(task.scheduledFor) > todayKey)
    .slice(0, 6);
  const planPct = allTasks.length ? Math.round((done.length / allTasks.length) * 100) : 0;

  return shell(
    <>
      <PanelHeading
        title="Koçluk merkezi"
        description={
          adaptivePlanEnabled
            ? "Koçun, haftalık planın ve hedeflerin tek ekranda."
            : "Uyarlanabilir plan şu anda kapalı; koçluk durumu ve hedeflerini buradan takip edebilirsin."
        }
      />

      {coaching ? (
        <PanelCard className="mt-6">
          <PanelCardTitle>Koçun</PanelCardTitle>
          <dl className="mt-3 grid gap-2 text-[14px] text-dc-ink-body sm:grid-cols-2">
            <div>
              <dt className="text-dc-ink-faint">Koç</dt>
              <dd className="mt-0.5 font-semibold">{coaching.coachName}</dd>
            </div>
            <div>
              <dt className="text-dc-ink-faint">Sonraki görüşme</dt>
              <dd className={`mt-0.5 font-semibold ${coaching.overdue ? "text-[#C2493D]" : ""}`}>
                {coaching.nextScheduledAt
                  ? DATE_TIME.format(coaching.nextScheduledAt)
                  : "Planlanmadı"}
                {coaching.overdue && coaching.overdueDays !== null
                  ? ` · ${coaching.overdueDays} gün gecikti`
                  : ""}
              </dd>
            </div>
          </dl>
          {coaching.focus ? (
            <p className="mt-3 text-[13.5px] text-dc-ink-body">
              <span className="font-semibold">Bu haftanın odağı:</span> {coaching.focus}
            </p>
          ) : null}
          {coaching.sharedNote ? (
            <p className="mt-3 rounded-[10px] border border-dc-line-soft bg-dc-surface-soft px-3.5 py-3 text-[14px] leading-[1.6] text-dc-ink-body">
              {coaching.sharedNote}
            </p>
          ) : (
            <p className="mt-3 text-[13px] text-dc-ink-muted">Bu hafta için yeni koç notu yok.</p>
          )}
        </PanelCard>
      ) : (
        <PanelEmpty
          title="Henüz atanmış koç görünmüyor."
          body="Koç ataması yapıldığında görüşme bilgisi ve yönlendirmeler burada açılır."
        />
      )}

      <PanelCard className="mt-5">
        <PanelCardTitle>Yapılacaklar</PanelCardTitle>
        {!adaptivePlanEnabled ? (
          <p className="mt-3 text-[13.5px] text-dc-ink-muted">
            Uyarlanabilir haftalık plan kapalı olduğu için koçluk görev listesi şu an üretilmiyor.
          </p>
        ) : !plan ? (
          <p className="mt-3 text-[13.5px] text-dc-ink-muted">
            Bu hafta için plan henüz hazırlanmadı. Koçun planı hazırladığında görevlerin burada görünecek.
          </p>
        ) : (
          <>
            <p className="mt-3 text-[13.5px] text-dc-ink-muted">
              %{planPct} tamamlandı · {done.length} / {allTasks.length} görev.
            </p>

            {todayPending.length ? (
              <>
                <PanelSectionLabel>Bugün</PanelSectionLabel>
                <ul className="mt-2.5 rounded-xl border border-dc-line bg-white">
                  {todayPending.map((task, index) => (
                    <PanelTaskRow
                      key={task.id}
                      title={`${task.title} · ${task.durationMinutes} dk`}
                      meta="Koçluk planı"
                      right={DATE.format(task.scheduledFor)}
                      done={false}
                      last={index === todayPending.length - 1}
                    />
                  ))}
                </ul>
              </>
            ) : null}

            {upcomingPending.length ? (
              <>
                <PanelSectionLabel>Bu hafta</PanelSectionLabel>
                <ul className="mt-2.5 rounded-xl border border-dc-line bg-white">
                  {upcomingPending.map((task, index) => (
                    <PanelTaskRow
                      key={task.id}
                      title={`${task.title} · ${task.durationMinutes} dk`}
                      meta="Koçluk planı"
                      right={DATE.format(task.scheduledFor)}
                      done={false}
                      last={index === upcomingPending.length - 1}
                    />
                  ))}
                </ul>
              </>
            ) : null}

            {!todayPending.length && !upcomingPending.length ? (
              <p className="mt-3 text-[13.5px] text-dc-ink-muted">
                Bu haftaki plan görevlerin tamamlanmış görünüyor.
              </p>
            ) : null}
          </>
        )}
      </PanelCard>

      <PanelCard className="mt-5">
        <PanelCardTitle>Hedef özeti</PanelCardTitle>
        {goals.length === 0 ? (
          <p className="mt-3 text-[13.5px] text-dc-ink-muted">
            Henüz hedef belirlenmedi. Görüşmede koçunla birlikte net ve plan hedeflerini tanımlayabilirsin.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2.5 text-[14px] text-dc-ink-body">
            {goals.slice(0, 5).map((goal) => (
              <li key={goal.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{goal.label}</span>
                <span className="text-dc-ink-muted">
                  {goal.current === null
                    ? "ölçüm yok"
                    : goal.kind === "PLAN_COMPLETION"
                      ? `şimdi %${goal.current}`
                      : `şimdi ${NUM.format(goal.current)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>

      <PanelCard className="mt-5">
        <PanelCardTitle>Hızlı erişim</PanelCardTitle>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {adaptivePlanEnabled ? (
            <Link href="/panel/ogrenci/plan" className="panel-quick-action panel-quick-action-primary">
              Haftalık planı aç
            </Link>
          ) : null}
          <Link href="/panel/ogrenci/hedefler" className="panel-quick-action">
            Hedefleri aç
          </Link>
          <Link href="/panel/ogrenci/odevler" className="panel-quick-action">
            Çalışmaları aç
          </Link>
        </div>
      </PanelCard>
    </>,
  );
}
