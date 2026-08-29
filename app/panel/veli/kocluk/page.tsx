import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/auth/guards";
import { resolveParentScope } from "@/lib/panel/parent-scope";
import { getStudentCoaching } from "@/lib/panel/coaching";
import { PanelShell } from "@/components/panel/panel-shell";
import { ChildSwitcher } from "@/components/panel/parent/child-switcher";
import { PanelHeading, PanelCard, PanelCardTitle, PanelEmpty } from "@/components/panel/ui";
import {
  addIstanbulCalendarDays,
  formatIstanbulDateInput,
  ISTANBUL_TIME_ZONE,
  istanbulWeekStart,
} from "@/lib/istanbul-time";

export const dynamic = "force-dynamic";

/**
 * VELİ · KOÇLUK — onaylı tasarım (Panel.dc.html → pCoach).
 *
 * Tasarımın işlev tanımı: haftanın planı ve tamamlanma oranı, gün gün görev
 * özeti ve veliye açık koç özeti.
 *
 * GİZLİLİK: koçun birebir görüşme notları veliyle PAYLAŞILMAZ. Bu ekran
 * yalnız planın kendisini ve tamamlanma durumunu gösterir.
 *
 * ÜRÜN KAPSAMI: Online Koçum (OK). Çocuğun koçluk yetkisi yoksa dürüst durum
 * gösterilir — sayfa boş bırakılmaz.
 */

const DAY_LABEL = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const RANGE = new Intl.DateTimeFormat("tr-TR", { timeZone: ISTANBUL_TIME_ZONE, day: "numeric", month: "long" });
const DAY_NUMBER = new Intl.DateTimeFormat("tr-TR", { timeZone: ISTANBUL_TIME_ZONE, day: "numeric" });

export default async function ParentCoachingPage({
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
      pageTitle="Koçluk"
      topbarSlot={
        <ChildSwitcher
          options={children}
          selectedId={selected?.id ?? null}
          basePath="/panel/veli/kocluk"
        />
      }
    >
      <div className="max-w-[1000px]">{body}</div>
    </PanelShell>
  );

  if (!selected) {
    return shell(
      <>
        <PanelHeading title="Koçluk" />
        <PanelEmpty
          title="Henüz bağlı öğrenci yok."
          body="Hesabınız öğrencinizle eşleştirildiğinde koçluk özeti burada açılır."
        />
      </>,
    );
  }

  if (!selected.products.includes("OK")) {
    return shell(
      <>
        <PanelHeading title="Koçluk" description={selected.name} />
        <PanelEmpty
          title="Bu hesapta Online Koçum bulunmuyor."
          body="Koçluk eklendiğinde haftalık plan, tamamlanma oranı ve koç özeti burada görünür."
        />
      </>,
    );
  }

  const [plan, coaching] = await Promise.all([
    prisma.weeklyPlan.findFirst({
      where: { studentId: selected.id },
      orderBy: { weekStart: "desc" },
      include: { tasks: { orderBy: [{ scheduledFor: "asc" }, { position: "asc" }] } },
    }),
    /*
     * GİZLİLİK: `getStudentCoaching` özel koç notunu (`privateNote`) hiç
     * seçmez — yalnız koçun paylaşmayı seçtiği `sharedNote` döner. Veliye
     * gidecek yolda özel notun sızmaması alan seçimiyle garanti altındadır,
     * bu bileşenin dikkatine bırakılmaz.
     */
    getStudentCoaching(selected.id),
  ]);

  /*
   * Koç kartı plan kontrolünden ÖNCE hazırlanır ve her dalda basılır.
   * Önce yalnız plan yayınlandığında görünüyordu; oysa "koçum kim, sonraki
   * görüşme ne zaman" bilgisi plan henüz yokken DAHA da gereklidir.
   */
  const coachCard = coaching ? (
    <PanelCard className="mt-5">
      <PanelCardTitle>Koç</PanelCardTitle>
      <dl className="mt-3 flex flex-col gap-2.5 text-[14px] font-medium text-dc-ink-body">
        <div className="flex justify-between gap-3">
          <dt>Koçu</dt>
          <dd className="text-dc-ink-muted">{coaching.coachName}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Sonraki görüşme</dt>
          <dd className={coaching.overdue ? "text-[#C2493D]" : "text-dc-ink-muted"}>
            {coaching.nextScheduledAt ? RANGE.format(coaching.nextScheduledAt) : "Planlanmadı"}
            {coaching.overdue && coaching.overdueDays !== null
              ? ` · ${coaching.overdueDays} gün gecikti`
              : ""}
          </dd>
        </div>
        {coaching.focus ? (
          <div className="flex justify-between gap-3">
            <dt>Haftanın odağı</dt>
            <dd className="text-dc-ink-muted">{coaching.focus}</dd>
          </div>
        ) : null}
      </dl>
      {coaching.sharedNote ? (
        <p className="mt-3.5 rounded-[10px] border border-dc-line-soft bg-[#FCFDFC] px-3.5 py-3 text-[14px] leading-[1.6] text-dc-ink-body">
          {coaching.sharedNote}
        </p>
      ) : null}
      <p className="mt-2.5 text-[12.5px] text-dc-ink-faint">
        Koçun öğrenciyle paylaştığı özet gösterilir; birebir görüşme notları
        paylaşılmaz.
      </p>
    </PanelCard>
  ) : null;

  if (!plan) {
    return shell(
      <>
        <PanelHeading title="Koçluk" description={selected.name} />
        {coachCard}
        <PanelEmpty
          title="Bu hafta için plan yayınlanmadı."
          body="Koç haftalık planı yayınladığında görevler ve tamamlanma oranı burada görünür."
        />
      </>,
    );
  }

  const start = istanbulWeekStart(plan.weekStart);
  const end = addIstanbulCalendarDays(start, 6);

  const done = plan.tasks.filter((t) => t.status === "DONE").length;
  const total = plan.tasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const days = Array.from({ length: 7 }, (_, i) => addIstanbulCalendarDays(start, i));

  return shell(
    <>
      <PanelHeading
        title="Koçluk"
        description={`${selected.name} · ${RANGE.format(start)} – ${RANGE.format(end)}`}
      />

      {coachCard}

      <PanelCard className="mt-5">
        <PanelCardTitle>Bu haftanın planı</PanelCardTitle>
        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-dc-line-soft"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Haftalık plan tamamlanma"
        >
          <div className="h-full rounded-full bg-dc-brand" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-[13.5px] text-dc-ink-muted">
          %{pct} tamamlandı · {done} / {total} görev
        </p>
      </PanelCard>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {days.map((day, i) => {
          const tasks = plan.tasks.filter(
            (t) => formatIstanbulDateInput(t.scheduledFor) === formatIstanbulDateInput(day),
          );
          return (
            <div key={day.toISOString()}>
              <p className="text-[13px] font-bold text-dc-ink">
                {DAY_LABEL[i]} {DAY_NUMBER.format(day)}
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
                        {task.status === "DONE" ? "tamamlandı" : "bekliyor"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-[12.5px] leading-[1.6] text-dc-ink-faint">
        Koçun birebir görüşme notları veliyle paylaşılmaz. Bu ekran planın kendisini ve
        tamamlanma durumunu gösterir.
      </p>
    </>,
  );
}
