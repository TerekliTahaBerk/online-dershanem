import { requirePanelRole } from "@/lib/auth/guards";
import { getStudentHomeData } from "@/lib/panel/student-home-server";
import { getStudentFirstValue } from "@/lib/od/first-value-server";
import { ISTANBUL_TIME_ZONE } from "@/lib/istanbul-time";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelEmptyState } from "@/components/panel/empty-state";
import { NoProductAccess } from "@/components/panel/no-product-access";
import { TodayCard, type TodayRow } from "@/components/panel/student/today-card";
import { FirstValueChecklist } from "@/components/panel/first-value-checklist";
import {
  WeeklyPlanCard,
  LatestExamCard,
  NetTrendCard,
  DinoInsightCard,
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

export default async function StudentHomePage() {
  const session = await requirePanelRole("STUDENT");
  const now = new Date();
  const [data, firstValueSteps] = await Promise.all([
    getStudentHomeData({ userId: session.userId, role: session.role, now }),
    getStudentFirstValue(session.userId),
  ]);

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
      <PanelEmptyState
        title="Profiliniz hazırlanıyor."
        body="Yönetim ekibi öğrenci profilinizi tamamladığında dersleriniz burada görünecek."
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
    plan?.total ? `haftalık planında ${plan.total - plan.done} görev kaldı` : null,
    latest ? `son denemen ${TR_SHORT.format(latest.takenAt)}` : null,
  ].filter(Boolean);

  return shell(
    <div className="max-w-[1040px]">
      <h1 className="text-[26px] font-extrabold leading-[1.25] tracking-[-0.02em] text-dc-ink sm:text-[28px]">
        {greeting(now)}, {session.fullName?.split(" ")[0] || "hoş geldin"}.
      </h1>
      {summaryParts.length ? (
        <p className="mt-2 text-[15.5px] leading-[1.6] text-dc-ink-muted">
          {summaryParts.join(" · ")}.
        </p>
      ) : null}

      <TodayCard rows={rows} dateLabel={TR_DATE.format(now)} />

      <FirstValueChecklist steps={firstValueSteps} />

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

      <DinoInsightCard
        insight={data.dinoInsight?.insight ?? null}
        basis={data.dinoInsight?.basis ?? null}
        action={data.dinoInsight?.action ?? null}
      />

      {odk && !latest ? (
        <p className="mt-5 text-[14px] text-dc-ink-muted">
          Deneme Kulübü sonuçların girildiğinde net gelişimin ve analiz burada açılır.
        </p>
      ) : null}
    </div>,
  );
}
