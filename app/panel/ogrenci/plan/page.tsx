import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireProductRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelHeading, PanelCard, PanelEmpty } from "@/components/panel/ui";

export const dynamic = "force-dynamic";

/**
 * ÖĞRENCİ · HAFTALIK PLAN — onaylı tasarım (Panel.dc.html → scPlan).
 *
 * ÜRÜN KAPSAMI: Online Koçum (OK). Koçluk yetkisi olmayan öğrenci bu
 * route'u açamaz — guard `requireProductRole("OK", …)`.
 *
 * Tasarımın işlev tanımı: hafta aralığı ve odak satırı, ilerleme çubuğu +
 * "x / y görev", 7 günlük ızgara (her gün kendi kartları; tamamlanan görev
 * sol kenarlıkla işaretli, boş gün kesik çizgili), altta koçun notu.
 */

const DAY_LABEL = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const RANGE = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });
const TIME = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });

/** Haftanın pazartesi başlangıcı (JS'te pazar 0). */
function mondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

export default async function StudentPlanPage() {
  const session = await requireProductRole("OK", "STUDENT");
  if (!getPanelFeatureFlags().adaptivePlan) notFound();

  const profile = await prisma.studentProfile.findUnique({ where: { userId: session.userId } });

  const shell = (children: React.ReactNode) => (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Haftalık planım"
    >
      <div className="max-w-[1040px]">{children}</div>
    </PanelShell>
  );

  if (!profile) {
    return shell(
      <>
        <PanelHeading title="Haftalık planın" />
        <PanelEmpty
          title="Profilin hazırlanıyor."
          body="Öğrenci profilin tamamlandığında koçunun kurduğu plan burada görünecek."
        />
      </>,
    );
  }

  const plan = await prisma.weeklyPlan.findFirst({
    where: { studentId: profile.id },
    orderBy: { weekStart: "desc" },
    include: { tasks: { orderBy: [{ scheduledFor: "asc" }, { position: "asc" }] } },
  });

  if (!plan) {
    return shell(
      <>
        <PanelHeading title="Haftalık planın" />
        <PanelEmpty
          title="Bu hafta için plan hazırlanmadı."
          body="Koçun haftalık planını yayınladığında görevlerin gün gün burada listelenir."
        />
      </>,
    );
  }

  const start = mondayOf(plan.weekStart);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });

  const done = plan.tasks.filter((t) => t.status === "DONE").length;
  const total = plan.tasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  return shell(
    <>
      <PanelHeading
        title="Haftalık planın"
        description={`${RANGE.format(start)} – ${RANGE.format(end)}`}
      />

      <div className="mt-5 flex items-center gap-4">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-dc-line-soft"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Haftalık plan ilerlemesi"
        >
          <div className="h-full rounded-full bg-dc-brand" style={{ width: `${pct}%` }} />
        </div>
        <span className="shrink-0 text-[14px] font-bold text-dc-ink">
          {done} / {total} görev
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {days.map((day, i) => {
          const tasks = plan.tasks.filter(
            (t) => t.scheduledFor.toDateString() === day.toDateString(),
          );
          return (
            <div key={day.toISOString()}>
              <p className="text-[13px] font-bold text-dc-ink">
                {DAY_LABEL[i]} {day.getDate()}
              </p>
              <div className="mt-2.5 flex flex-col gap-2">
                {tasks.length === 0 ? (
                  <p className="rounded-[10px] border border-dashed border-[#CBD6D0] p-3 text-[11.5px] text-dc-ink-ghost">
                    Boş gün
                  </p>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`rounded-[10px] border border-dc-line bg-white p-3 ${
                        task.status === "DONE" ? "border-l-[3px] border-l-dc-brand" : ""
                      }`}
                    >
                      <p className="text-[12.5px] font-semibold text-dc-ink">{task.title}</p>
                      <p className="mt-0.5 text-[11.5px] text-dc-ink-faint">
                        {task.durationMinutes} dk ·{" "}
                        {task.status === "DONE" ? "tamamlandı" : TIME.format(task.scheduledFor)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {plan.changeRequestCategory ? (
        <PanelCard className="mt-6 max-w-[760px]">
          <h2 className="text-[15px] font-bold text-dc-ink">Koçunun notu</h2>
          <p className="mt-2 text-[14.5px] leading-[1.65] text-[var(--pd-ink-3)]">
            {plan.changeRequestCategory}
          </p>
        </PanelCard>
      ) : null}
    </>,
  );
}
