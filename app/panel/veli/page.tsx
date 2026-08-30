import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/auth/guards";
import { resolveParentScope } from "@/lib/panel/parent-scope";
import { PanelShell } from "@/components/panel/panel-shell";
import { ChildSwitcher } from "@/components/panel/parent/child-switcher";
import { PanelHeading, PanelCard, PanelCardTitle, PanelEmpty } from "@/components/panel/ui";
import { DinoInsightCard } from "@/components/panel/student/home-cards";
import { getActionableDinoInsight } from "@/lib/panel/dino-actionable-insight-server";
import { getParentFirstValue } from "@/lib/od/first-value-server";
import { FirstValueChecklist } from "@/components/panel/first-value-checklist";

export const dynamic = "force-dynamic";

/**
 * VELİ · ANA SAYFA — onaylı tasarım (Panel.dc.html → scParentHome).
 *
 * Tasarımın işlev tanımı: 4 kolonlu metrik şeridi (katılım, plan görevleri,
 * deneme, net), turuncu kenarlı "Dikkat edilmesi gereken" kartı, yan yana
 * Dersler ve Koçluk kartları, altta Dino veli özeti.
 *
 * VELİ PANELİ ÖĞRENCİ PANELİNİN KOPYASI DEĞİLDİR (§23): burada görev
 * tamamlama, katılım ve eğilim özetlenir; öğretmenin öğrenciye özel notu ve
 * koçluk görüşme notları GÖSTERİLMEZ.
 *
 * Ürün blokları ÇOCUĞUN yetkisine göre açılır (velinin değil).
 */

const DAY = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });
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

  const hasOD = selected.products.includes("OD");
  const hasOK = selected.products.includes("OK");
  const hasODK = selected.products.includes("ODK");

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: selected.id, endedAt: null },
    select: { groupId: true },
  });
  const groupIds = enrollments.map((e) => e.groupId);

  const [attendance, lessons, plan, exams, dinoInsight, firstValueSteps] = await Promise.all([
    prisma.attendance.findMany({
      where: { studentId: selected.id },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    groupIds.length
      ? prisma.lesson.findMany({
          where: { groupId: { in: groupIds } },
          orderBy: { startsAt: "desc" },
          take: 3,
          include: {
            teacher: { select: { fullName: true } },
            notes: { where: { studentId: null }, take: 1 },
            attendances: { where: { studentId: selected.id }, select: { status: true } },
          },
        })
      : Promise.resolve([]),
    hasOK ? prisma.weeklyPlan.findFirst({
      where: { studentId: selected.id },
      orderBy: { weekStart: "desc" },
      include: { tasks: { select: { status: true } } },
    }) : Promise.resolve(null),
    hasODK
      ? prisma.mockExam.findMany({
          where: { studentId: selected.id },
          orderBy: { takenAt: "desc" },
          take: 2,
          include: { sections: true },
        })
      : Promise.resolve([]),
    getActionableDinoInsight({ studentId: selected.id, audience: "PARENT" }),
    getParentFirstValue(session.userId, selected.id),
  ]);

  const attended = attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
  const planDone = plan?.tasks.filter((t) => t.status === "DONE").length ?? 0;
  const planTotal = plan?.tasks.length ?? 0;
  const planPct = planTotal ? Math.round((planDone / planTotal) * 100) : 0;

  const latestExam = exams[0];
  const latestNet = latestExam ? latestExam.sections.reduce((s, x) => s + net(x), 0) : null;
  const prevNet = exams[1] ? exams[1].sections.reduce((s, x) => s + net(x), 0) : null;

  const missed = attendance.filter((a) => a.status === "ABSENT").length;
  const overduePlan = planTotal - planDone;

  /* "Dikkat edilmesi gereken" — yalnız gerçek sinyal varsa gösterilir. */
  const attention =
    missed > 0
      ? `Son ${attendance.length} derste ${missed} katılmama var. Devamsızlığın sebebini öğrenciyle konuşmak iyi olabilir.`
      : planTotal > 0 && planPct < 60
        ? `Bu haftanın planında ${overduePlan} görev bekliyor (%${planPct} tamamlandı).`
        : null;

  const stat = (label: string, value: string, tone?: "brand") => (
    <div className="border-b border-dc-line-soft px-[22px] py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-[13px] text-dc-ink-faint">{label}</p>
      <p
        className={`mt-1.5 text-[24px] font-extrabold ${
          tone === "brand" ? "text-dc-brand-hover" : "text-dc-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );

  return shell(
    <>
      <PanelHeading
        title={`${selected.name} · bu haftası`}
        description={[
          hasOD ? `${attended}/${attendance.length} derse katıldı` : null,
          planTotal ? `plan %${planPct}` : null,
          latestNet !== null ? `son deneme ${latestNet.toFixed(2)} net` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      />

      <FirstValueChecklist steps={firstValueSteps} />

      <div className="mt-6 grid overflow-hidden rounded-[14px] border border-dc-line bg-white sm:grid-cols-2 lg:grid-cols-4">
        {stat("Derse katılım", attendance.length ? `${attended} / ${attendance.length}` : "—")}
        {stat("Plan görevleri", planTotal ? `${planDone} / ${planTotal}` : "—")}
        {stat("Deneme", exams.length ? `${exams.length} deneme` : hasODK ? "Sonuç yok" : "—")}
        {stat(
          "Son deneme neti",
          latestNet !== null ? latestNet.toFixed(2) : "—",
          latestNet !== null && prevNet !== null && latestNet >= prevNet ? "brand" : undefined,
        )}
      </div>

      {attention ? (
        <div className="mt-5 max-w-[760px] rounded-[14px] border border-dc-line border-l-[3px] border-l-[#E0A34A] bg-white px-[22px] py-5">
          <h2 className="text-[15.5px] font-bold text-dc-ink">Dikkat edilmesi gereken</h2>
          <p className="mt-2 text-[14.5px] leading-[1.65] text-[var(--pd-ink-3)]">{attention}</p>
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {hasOD ? (
          <PanelCard>
            <PanelCardTitle>Dersler</PanelCardTitle>
            {lessons.length ? (
              <>
                <ul className="mt-3.5 flex flex-col gap-3 text-[14px] font-medium text-[var(--pd-ink-3)]">
                  {lessons.map((lesson) => {
                    const status = lesson.attendances[0]?.status;
                    const label =
                      status === "ABSENT"
                        ? "Katılmadı"
                        : status === "LATE"
                          ? "Geç katıldı"
                          : status === "PRESENT"
                            ? "Katıldı"
                            : "İşlenmedi";
                    return (
                      <li key={lesson.id} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate">
                          {lesson.title} · {DAY.format(lesson.startsAt)}
                        </span>
                        <span
                          className={`shrink-0 ${
                            status === "ABSENT" ? "text-[#8A5F37]" : "text-dc-brand-hover"
                          }`}
                        >
                          {label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {lessons[0]?.notes[0]?.topic ? (
                  <p className="mt-3.5 text-[13.5px] leading-[1.6] text-dc-ink-muted">
                    Son ders: {lessons[0].notes[0].topic}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-3 text-[14px] text-dc-ink-muted">
                Henüz işlenmiş ders yok. Dersler başladığında burada görünecek.
              </p>
            )}
          </PanelCard>
        ) : null}

        {/* Koçluk — çocuğun planı varsa özet, yoksa tasarımdaki kesik çizgili durum */}
        {hasOK && planTotal ? (
          <PanelCard>
            <PanelCardTitle>Koçluk</PanelCardTitle>
            <div
              className="mt-4 h-2 overflow-hidden rounded-full bg-dc-line-soft"
              role="progressbar"
              aria-valuenow={planPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Haftalık plan tamamlanma"
            >
              <div className="h-full rounded-full bg-dc-brand" style={{ width: `${planPct}%` }} />
            </div>
            <p className="mt-2 text-[13px] text-dc-ink-muted">
              Bu haftanın planı %{planPct} tamamlandı · {planDone} / {planTotal} görev.
            </p>
            <p className="mt-3.5 text-[13.5px] leading-[1.6] text-dc-ink-muted">
              Koçun veliye açık özeti burada görünür; görüşmelerin özel notları paylaşılmaz.
            </p>
          </PanelCard>
        ) : (
          <div className="rounded-[14px] border border-dashed border-[#CBD6D0] bg-white p-[22px]">
            <PanelCardTitle>Koçluk</PanelCardTitle>
            <p className="mt-2 text-[14px] leading-[1.6] text-dc-ink-muted">
              Bu öğrencinin hesabında Online Koçum bulunmuyor. Koçluk eklendiğinde haftalık
              plan ve takip burada görünür.
            </p>
            <Link
              href="/paketler"
              className="mt-3.5 inline-block rounded-[10px] border border-[#DDE4E0] bg-white px-4 py-2.5 text-[13.5px] font-bold text-dc-ink transition-colors hover:border-dc-brand"
            >
              Paketi görüntüle
            </Link>
          </div>
        )}
      </div>

      <DinoInsightCard
        insight={dinoInsight?.insight ?? null}
        basis={dinoInsight?.basis ?? null}
        action={dinoInsight?.action ?? null}
        audience="PARENT"
      />
    </>,
  );
}
