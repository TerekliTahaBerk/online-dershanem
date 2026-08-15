import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelHeading, PanelEmpty } from "@/components/panel/ui";

export const dynamic = "force-dynamic";

/**
 * EĞİTMEN · TAKVİM — onaylı tasarım (Panel.dc.html → eCal).
 *
 * Tasarımın işlev tanımı: haftalık ızgara — solda saat sütunu, üstte günler,
 * hücrelerde ders kartı (grup adı + öğrenci sayısı). Üst satırda hafta
 * aralığı ve toplam haftalık yük.
 *
 * Izgara gerçek ders saatlerinden kurulur: haftanın dolu saat dilimleri
 * hesaplanır, boş saatler ızgarayı şişirmez.
 */

const DAY_LABEL = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const RANGE = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });

function mondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

const hhmm = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export default async function TeacherCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ hafta?: string }>;
}) {
  const session = await requireRole("TEACHER");
  const offset = Number((await searchParams).hafta ?? 0) || 0;

  const start = mondayOf(new Date());
  start.setDate(start.getDate() + offset * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const lessons = await prisma.lesson.findMany({
    where: { teacherId: session.userId, startsAt: { gte: start, lt: end } },
    orderBy: { startsAt: "asc" },
    include: {
      group: {
        select: { name: true, enrollments: { where: { endedAt: null }, select: { id: true } } },
      },
    },
  });

  // Haftalık yük — planlanan ders süreleri toplamı
  const totalMinutes = lessons.reduce(
    (sum, l) => sum + Math.max(0, (l.endsAt.getTime() - l.startsAt.getTime()) / 60000),
    0,
  );
  const loadHours = Math.round((totalMinutes / 60) * 10) / 10;

  // Yalnız dolu saat dilimleri satır olur
  const slots = [...new Set(lessons.map((l) => hhmm(l.startsAt)))].sort();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });

  const endLabel = new Date(end);
  endLabel.setDate(endLabel.getDate() - 1);

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Takvim"
    >
      <div className="max-w-[1040px]">
        <PanelHeading
          title="Takvim"
          description={`${RANGE.format(start)} – ${RANGE.format(endLabel)} · haftalık yük ${loadHours} saat`}
          actions={
            <>
              <a
                href={`/panel/ogretmen/takvim?hafta=${offset - 1}`}
                className="rounded-lg border border-[#DDE4E0] bg-white px-3.5 py-2.5 text-[13px] font-semibold text-dc-ink-muted transition-colors hover:border-dc-brand"
              >
                ← Önceki
              </a>
              <a
                href={`/panel/ogretmen/takvim?hafta=${offset + 1}`}
                className="rounded-lg border border-[#DDE4E0] bg-white px-3.5 py-2.5 text-[13px] font-semibold text-dc-ink-muted transition-colors hover:border-dc-brand"
              >
                Sonraki →
              </a>
            </>
          }
        />

        {lessons.length === 0 ? (
          <PanelEmpty
            title="Bu hafta planlanmış ders yok."
            body="Ders planlandığında haftalık ızgarada saatiyle birlikte görünecek."
          />
        ) : (
          <div className="mt-5 overflow-x-auto rounded-[14px] border border-dc-line bg-white">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <caption className="sr-only">Haftalık ders takvimi</caption>
              <thead>
                <tr className="border-b border-dc-line bg-dc-panel-head">
                  <th scope="col" className="w-[70px] px-2.5 py-3 text-[12.5px] font-bold text-dc-ink-muted">
                    Saat
                  </th>
                  {days.map((d, i) => (
                    <th
                      key={d.toISOString()}
                      scope="col"
                      className="px-2.5 py-3 text-[12.5px] font-bold text-dc-ink-muted"
                    >
                      {DAY_LABEL[i]} {d.getDate()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={slot} className="border-b border-dc-line-soft last:border-0">
                    <th
                      scope="row"
                      className="px-2.5 py-3 align-top text-[12.5px] font-normal text-dc-ink-ghost"
                    >
                      {slot}
                    </th>
                    {days.map((day) => {
                      const cell = lessons.filter(
                        (l) =>
                          hhmm(l.startsAt) === slot &&
                          l.startsAt.toDateString() === day.toDateString(),
                      );
                      return (
                        <td key={day.toISOString()} className="p-2 align-top">
                          {cell.map((lesson) => (
                            <div
                              key={lesson.id}
                              className={`rounded-lg p-2 ${
                                lesson.status === "CANCELLED"
                                  ? "border border-dc-line bg-white opacity-60"
                                  : "border border-dc-brand-soft-line bg-dc-brand-soft"
                              }`}
                            >
                              <p
                                className={`text-[12px] font-semibold ${
                                  lesson.status === "CANCELLED"
                                    ? "text-dc-ink-muted line-through"
                                    : "text-dc-brand-deep"
                                }`}
                              >
                                {lesson.group.name}
                              </p>
                              <p className="text-[11px] text-[#3F5C51]">
                                {lesson.group.enrollments.length} öğrenci
                              </p>
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PanelShell>
  );
}
