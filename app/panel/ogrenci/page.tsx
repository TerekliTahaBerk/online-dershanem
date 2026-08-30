import { requirePanelRole } from "@/lib/auth/guards";
import { getStudentHomeData } from "@/lib/panel/student-home-server";
import { ISTANBUL_TIME_ZONE } from "@/lib/istanbul-time";
import { buildHomeDeterministicReason } from "@/lib/panel/dino-explanations";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { PanelShell } from "@/components/panel/panel-shell";
import { NoProductAccess } from "@/components/panel/no-product-access";
import { PanelHeading, PanelEmpty, PanelCard } from "@/components/panel/ui";
import { TrackedPanelLink } from "@/components/panel/tracked-panel-link";
import { TodayCard, type TodayRow } from "@/components/panel/student/today-card";
import { DinoExplanationAction } from "@/components/panel/dino-explanation-action";
import {
  WeeklyPlanCard,
  LatestExamCard,
  NetTrendCard,
  type PlanTaskRow,
  type TrendPoint,
} from "@/components/panel/student/home-cards";

export const dynamic = "force-dynamic";

/**
 * TEK PANEL öğrenci ana sayfası. API ile aynı domain service'ini kullanır;
 * erişimi olmayan ürünün sorgusu çalışmaz ve bölümü render edilmez.
 */

const TR_DATE = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const TR_TIME = new Intl.DateTimeFormat("tr-TR", { timeZone: ISTANBUL_TIME_ZONE, hour: "2-digit", minute: "2-digit" });
const TR_SHORT = new Intl.DateTimeFormat("tr-TR", { timeZone: ISTANBUL_TIME_ZONE, day: "numeric", month: "long" });

function greeting(now: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: ISTANBUL_TIME_ZONE,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );
  if (hour < 11) return "Günaydın";
  if (hour < 18) return "İyi günler";
  return "İyi akşamlar";
}

function ageBandForDate(target: Date, now: Date): "0-24H" | "25H-7D" | "8D+" {
  const diff = Math.max(0, target.getTime() - now.getTime());
  const day = 24 * 60 * 60 * 1000;
  if (diff <= day) return "0-24H";
  if (diff <= 7 * day) return "25H-7D";
  return "8D+";
}

export default async function StudentHomePage() {
  const session = await requirePanelRole("STUDENT");
  const now = new Date();
  const data = await getStudentHomeData({
    userId: session.userId,
    role: session.role,
    now,
  });

  const shell = (children: React.ReactNode) => (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Ana Sayfa"
    >
      {children}
    </PanelShell>
  );

  if (data.products.length === 0) return shell(<NoProductAccess role="STUDENT" />);
  if (!data.profile) {
    return shell(
      <PanelEmpty
        title="Profiliniz hazırlanıyor."
        body="Yönetim ekibi öğrenci profilinizi tamamladığında dersleriniz burada görünecek."
        className="mt-0 border-dashed px-6 py-14 text-center"
      />,
    );
  }

  const od = data.productData.OD;
  const ok = data.productData.OK;
  const odk = data.productData.ODK;
  const latest = odk?.latestExam ?? null;
  const plan = ok?.weeklyPlan ?? null;

  const rows: TodayRow[] = [
    ...(od?.todayLessons ?? []).map((lesson) => ({
      id: `lesson-${lesson.id}`,
      when: TR_TIME.format(lesson.startsAt),
      title: `${lesson.title} · Canlı ders`,
      meta: [lesson.teacherName, lesson.groupName].filter(Boolean).join(" · "),
      action: { label: "Derse katıl", href: "/panel/ogrenci/takvim", primary: true },
    })),
    ...(od?.nextRecovery
      ? [{
          id: `recovery-${od.nextRecovery.id}`,
          when: "72 saat",
          title: `${od.nextRecovery.lessonTitle} · Kaçırılan ders`,
          meta: `Hedef: ${TR_SHORT.format(od.nextRecovery.dueAt)}`,
          action: { label: "Telafi et", href: "/panel/ogrenci/telafi" },
        }]
      : []),
    ...(ok?.todayTasks ?? []).map((task) => ({
      id: `task-${task.id}`,
      when: TR_TIME.format(task.scheduledFor),
      title: `${task.title} · ${task.durationMinutes} dk`,
      meta: "Haftalık plan görevi",
      action: { label: "Görevi aç", href: "/panel/ogrenci/plan" },
    })),
  ];

  const planTasks: PlanTaskRow[] = (plan?.tasks ?? []).map((task) => ({
    id: task.id,
    title: `${task.title} · ${task.durationMinutes} dk`,
    meta: TR_SHORT.format(task.scheduledFor),
    done: task.done,
  }));

  const trend: TrendPoint[] = (odk?.trend ?? []).map((point, index) => ({
    label: `D${index + 1}`,
    net: point.net,
  }));
  const trendCaption =
    trend.length >= 2
      ? `Toplam netin ${trend[0].net.toLocaleString("tr-TR")}'ten ${trend[trend.length - 1].net.toLocaleString("tr-TR")}'e ${
          trend[trend.length - 1].net >= trend[0].net ? "çıktı" : "indi"
        }. Karşılaştırma yalnızca kendi geçmiş denemelerinle yapılır.`
      : "";

  const summaryParts = [
    od?.todayLessons.length ? `bugün ${od.todayLessons.length} dersin var` : null,
    od?.nextRecovery ? "kaçırdığın ders için telafi adımı hazır" : null,
    plan?.total ? `haftalık planında ${plan.total - plan.done} görev kaldı` : null,
    latest ? `son denemen ${TR_SHORT.format(latest.takenAt)}` : null,
  ].filter(Boolean);

  const nextBestAction = od?.todayLessons[0]
    ? {
        product: "OD" as const,
        actionKind: "OPEN_LESSON" as const,
        reasonCode: "LIVE_LESSON" as const,
        ageBand: ageBandForDate(od.todayLessons[0].startsAt, now),
        title: `${od.todayLessons[0].title} · Canlı ders`,
        actionLabel: "Derse katıl",
        href: "/panel/ogrenci/takvim",
        reason: buildHomeDeterministicReason({ kind: "LESSON", startsAt: od.todayLessons[0].startsAt }, now),
        questionKey: "student_nba_reason",
      }
    : od?.nextRecovery
      ? {
          product: "OD" as const,
          actionKind: "OPEN_RECOVERY" as const,
          reasonCode: "MISSED_LESSON" as const,
          ageBand: ageBandForDate(od.nextRecovery.dueAt, now),
          title: `${od.nextRecovery.lessonTitle} · Kaçırılan ders`,
          actionLabel: "Telafi et",
          href: "/panel/ogrenci/telafi",
          reason: buildHomeDeterministicReason({ kind: "RECOVERY", dueAt: od.nextRecovery.dueAt }, now),
          questionKey: "student_nba_reason",
        }
      : ok?.todayTasks[0]
        ? {
            product: "OK" as const,
            actionKind: "OPEN_PLAN" as const,
            reasonCode: ok.todayTasks[0].reasonCode,
            ageBand: ageBandForDate(ok.todayTasks[0].scheduledFor, now),
            title: `${ok.todayTasks[0].title} · ${ok.todayTasks[0].durationMinutes} dk`,
            actionLabel: "Görevi aç",
            href: "/panel/ogrenci/plan",
            reason: buildHomeDeterministicReason({ kind: "PLAN_TASK", scheduledFor: ok.todayTasks[0].scheduledFor }, now),
            questionKey: "student_nba_reason",
          }
        : null;
  if (nextBestAction) {
    await recordPanelProductEvent(
      {
        name: "student_next_action_viewed",
        properties: {
          product: nextBestAction.product,
          actionKind: nextBestAction.actionKind,
          reasonCode: nextBestAction.reasonCode,
          ageBand: nextBestAction.ageBand,
          evidenceBand: "NA",
          role: "STUDENT",
        },
      },
      session.role,
    );
  }

  return shell(
    <div className="max-w-[1040px]">
      <PanelHeading
        title={`${greeting(now)}, ${session.fullName?.split(" ")[0] || "hoş geldin"}.`}
        description={summaryParts.length ? `${summaryParts.join(" · ")}.` : undefined}
      />

      <TodayCard rows={rows} dateLabel={TR_DATE.format(now)} />

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {plan ? (
          <WeeklyPlanCard
            done={plan.done}
            total={plan.total}
            tasks={planTasks}
            href="/panel/ogrenci/plan"
          />
        ) : null}

        {latest ? (
          <LatestExamCard
            net={latest.net}
            delta={latest.delta}
            title={latest.title}
            dateLabel={TR_SHORT.format(latest.takenAt)}
            subjects={latest.sections}
            href="/panel/ogrenci/denemeler"
          />
        ) : null}
      </div>

      {trend.length >= 2 ? <NetTrendCard points={trend} caption={trendCaption} /> : null}

      {nextBestAction ? (
        <PanelCard className="mt-5">
          <h2 className="text-[16px] font-bold text-dc-ink">Sonraki en iyi adım</h2>
          <p className="mt-2 text-[14.5px] leading-[1.65] text-[var(--pd-ink-3)]">{nextBestAction.title}</p>
          <TrackedPanelLink
            href={nextBestAction.href}
            className="panel-quick-action panel-quick-action-primary mt-3 inline-flex"
            event={{
              name: "student_next_action_clicked",
              properties: {
                product: nextBestAction.product,
                actionKind: nextBestAction.actionKind,
                reasonCode: nextBestAction.reasonCode,
                ageBand: nextBestAction.ageBand,
                evidenceBand: "NA",
                role: "STUDENT",
              },
            }}
          >
            {nextBestAction.actionLabel}
          </TrackedPanelLink>
          <DinoExplanationAction
            deterministicReason={nextBestAction.reason}
            questionKey={nextBestAction.questionKey}
          />
        </PanelCard>
      ) : null}

      {odk && !latest ? (
        <p className="mt-5 text-[14px] text-dc-ink-muted">
          Deneme Kulübü sonuçların girildiğinde net gelişimin ve analiz burada açılır.
        </p>
      ) : null}
    </div>,
  );
}
