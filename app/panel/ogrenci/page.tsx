import Link from "next/link";
import { requirePanelRole } from "@/lib/auth/guards";
import { getStudentHomeData } from "@/lib/panel/student-home-server";
import { ISTANBUL_TIME_ZONE } from "@/lib/istanbul-time";
import { buildStudentHomeActionPlan } from "@/lib/panel/student-home-actions";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { PanelShell } from "@/components/panel/panel-shell";
import { NoProductAccess } from "@/components/panel/no-product-access";
import { PanelHeading, PanelEmpty, PanelCard } from "@/components/panel/ui";
import { TrackedPanelLink } from "@/components/panel/tracked-panel-link";
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
      pageTitle="Bugün"
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
  const actionPlan = buildStudentHomeActionPlan({
    now,
    productData: data.productData,
    products: data.products,
  });
  const primaryAction = actionPlan.nowAction;
  const nextActions = actionPlan.nextActions;

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
    actionPlan.allActions.length
      ? `bugün ${Math.min(3, actionPlan.allActions.length)} öncelikli adımın hazır`
      : "bugün için bekleyen bir çalışma görünmüyor",
    plan?.total ? `planında ${Math.max(0, plan.total - plan.done)} görev kaldı` : null,
    od?.todayLessons.length ? `${od.todayLessons.length} canlı ders görünümü var` : null,
  ].filter(Boolean);

  if (primaryAction) {
    await recordPanelProductEvent(
      {
        name: "student_next_action_viewed",
        properties: {
          product: primaryAction.product,
          actionKind: primaryAction.actionKind,
          reasonCode: primaryAction.reasonCode,
          ageBand: primaryAction.ageBand,
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

      {primaryAction ? (
        <PanelCard className="mt-6">
          <h2 className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-dc-brand-hover">
            Şimdi
          </h2>
          <h3 className="mt-2 text-[18px] font-bold text-dc-ink">{primaryAction.title}</h3>
          {primaryAction.description ? (
            <p className="mt-1 text-[13.5px] text-dc-ink-faint">{primaryAction.description}</p>
          ) : null}
          <p className="mt-2 text-[14.5px] leading-[1.65] text-[var(--pd-ink-3)]">{primaryAction.reason}</p>
          <TrackedPanelLink
            href={primaryAction.href}
            className="panel-quick-action panel-quick-action-primary mt-4 inline-flex"
            event={{
              name: "student_next_action_clicked",
              properties: {
                product: primaryAction.product,
                actionKind: primaryAction.actionKind,
                reasonCode: primaryAction.reasonCode,
                ageBand: primaryAction.ageBand,
                evidenceBand: "NA",
                role: "STUDENT",
              },
            }}
          >
            {primaryAction.ctaLabel}
          </TrackedPanelLink>
          <DinoExplanationAction
            deterministicReason={primaryAction.reason}
            questionKey="student_nba_reason"
          />
        </PanelCard>
      ) : (
        <PanelCard className="mt-6">
          <h2 className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-dc-brand-hover">
            Şimdi
          </h2>
          <p className="mt-2 text-[15px] font-semibold text-dc-ink">
            Bugün için bekleyen bir çalışman görünmüyor.
          </p>
          <p className="mt-1.5 text-[14px] text-dc-ink-muted">
            Haftana göz atabilir veya gelişimini inceleyebilirsin.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.products.includes("OK") ? (
              <Link href="/panel/ogrenci/plan" className="panel-quick-action">
                Haftayı Gör
              </Link>
            ) : null}
            {data.products.includes("OD") ? (
              <Link href="/panel/ogrenci/gelisim" className="panel-quick-action">
                Gelişimime Bak
              </Link>
            ) : null}
            {data.products.includes("ODK") ? (
              <Link href="/panel/odk/ogrenci/denemeler" className="panel-quick-action">
                Denemelerime Bak
              </Link>
            ) : null}
          </div>
        </PanelCard>
      )}

      {nextActions.length ? (
        <PanelCard className="mt-5">
          <h2 className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-dc-ink-muted">
            Sonra
          </h2>
          <ul className="mt-3 space-y-3">
            {nextActions.map((action) => (
              <li key={action.id} className="rounded-xl border border-dc-line-soft p-3.5">
                <p className="text-[14.5px] font-semibold text-dc-ink">{action.title}</p>
                <p className="mt-1 text-[13.5px] text-dc-ink-muted">{action.reason}</p>
                <TrackedPanelLink
                  href={action.href}
                  className="panel-quick-action mt-2 inline-flex"
                  event={{
                    name: "student_next_action_clicked",
                    properties: {
                      product: action.product,
                      actionKind: action.actionKind,
                      reasonCode: action.reasonCode,
                      ageBand: action.ageBand,
                      evidenceBand: "NA",
                      role: "STUDENT",
                    },
                  }}
                >
                  {action.ctaLabel}
                </TrackedPanelLink>
              </li>
            ))}
          </ul>
        </PanelCard>
      ) : null}

      <PanelCard className="mt-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-dc-ink-muted">
            Bu hafta
          </h2>
          <span className="text-[12.5px] text-dc-ink-faint">{TR_DATE.format(now)}</span>
        </div>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
          <div className="rounded-xl border border-dc-line-soft px-3.5 py-3">
            <p className="text-[12px] text-dc-ink-faint">Plan tamamlanan</p>
            <p className="mt-1 text-[18px] font-bold text-dc-ink">
              {plan ? `${plan.done}/${plan.total}` : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-dc-line-soft px-3.5 py-3">
            <p className="text-[12px] text-dc-ink-faint">Yaklaşan ders</p>
            <p className="mt-1 text-[18px] font-bold text-dc-ink">
              {(od?.todayLessons ?? []).filter((lesson) => lesson.startsAt > now).length}
            </p>
          </div>
          <div className="rounded-xl border border-dc-line-soft px-3.5 py-3">
            <p className="text-[12px] text-dc-ink-faint">Yaklaşan deneme</p>
            <p className="mt-1 text-[18px] font-bold text-dc-ink">
              {odk?.upcomingExam ? 1 : 0}
            </p>
          </div>
        </div>
      </PanelCard>

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
            href="/panel/odk/ogrenci/denemeler"
          />
        ) : null}
      </div>

      {trend.length >= 2 ? <NetTrendCard points={trend} caption={trendCaption} /> : null}

      {odk && !latest ? (
        <p className="mt-5 text-[14px] text-dc-ink-muted">
          Deneme Kulübü sonuçların girildiğinde net gelişimin ve analiz burada açılır.
        </p>
      ) : null}
    </div>,
  );
}
