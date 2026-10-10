import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { formatIstanbulDateInput } from "@/lib/istanbul-time";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  PanelHeading,
  PanelTable,
  PanelTableRow,
  PanelTableCell,
  PanelEmpty,
  PageHeader,
  StatusBadge,
  ViewTabs,
  buttonClass,
} from "@/components/panel/ui";

export const dynamic = "force-dynamic";

/**
 * ÖĞRENCİ · DERSLERİN — onaylı tasarım (Panel.dc.html → sLessons).
 *
 * Tasarımın işlev tanımı: tek tablo, "Yaklaşan / Tamamlanan" filtresi,
 * satırda tarih+saat, ders ve konu, öğretmen, durum ve duruma göre değişen
 * tek aksiyon (Derse katıl / Detay / Notları gör / Telafi).
 *
 * OD ürün kapsamındadır → `requireRole` (OD erişimi şart).
 */

const DATE = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
});
const TIME = new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
});

type Filter = "yaklasan" | "tamamlanan";

export default async function StudentLessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  const session = await requireRole("STUDENT");
  const filter: Filter =
    (await searchParams).durum === "tamamlanan" ? "tamamlanan" : "yaklasan";

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.userId },
  });

  const shell = (children: React.ReactNode) => (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Dersler"
    >
      <div className="max-w-[1040px]">{children}</div>
    </PanelShell>
  );

  if (!profile) {
    return shell(
      <>
        <PanelHeading title="Derslerin" />
        <PanelEmpty
          title="Hesabını hazırlıyoruz."
          body="Her şey hazır olduğunda ders takvimini burada göreceksin."
        />
      </>,
    );
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: profile.id, endedAt: null },
    select: { groupId: true, group: { select: { name: true } } },
  });
  const groupIds = enrollments.map((e) => e.groupId);

  const now = new Date();
  const lessons = groupIds.length
    ? await prisma.lesson.findMany({
        where: {
          groupId: { in: groupIds },
          ...(filter === "yaklasan"
            ? { startsAt: { gte: now }, status: "PLANNED" }
            : { OR: [{ status: "COMPLETED" }, { startsAt: { lt: now } }] }),
        },
        orderBy: { startsAt: filter === "yaklasan" ? "asc" : "desc" },
        take: 50,
        include: {
          group: { select: { name: true } },
          teacher: { select: { fullName: true } },
          attendances: {
            where: { studentId: profile.id },
            select: { status: true },
          },
        },
      })
    : [];

  const groupNames = [...new Set(enrollments.map((e) => e.group.name))].join(
    " · ",
  );

  return shell(
    <>
      <PageHeader
        title="Derslerin"
        description={groupNames || undefined}
        actions={
          <a href="/api/panel/calendar/export" className={buttonClass("secondary")}>
            Takvime ekle (.ics)
          </a>
        }
      />
      <div className="mt-5 mb-4">
        <ViewTabs
          label="Ders görünümü"
          activeId={filter}
          tabs={[
            { id: "yaklasan", label: "Yaklaşan", href: "/panel/ogrenci/takvim" },
            { id: "tamamlanan", label: "Tamamlanan", href: "/panel/ogrenci/takvim?durum=tamamlanan" },
          ]}
        />
      </div>

      {lessons.length === 0 ? (
        <PanelEmpty
          title={
            filter === "yaklasan"
              ? "Yaklaşan bir dersin yok."
              : "Henüz tamamlanan bir ders yok."
          }
          body={
            filter === "yaklasan"
              ? "Yeni bir ders planlandığında ilk burada göreceksin."
              : "Derslerin işlendikçe öğretmen notlarıyla birlikte burada birikecek."
          }
        />
      ) : (
        <PanelTable
          caption="Ders listesi"
          columns={["Tarih", "Ders ve konu", "Öğretmen", "Durum", ""]}
        >
          {lessons.map((lesson) => {
            const attendance = lesson.attendances[0]?.status;
            const missed = attendance === "ABSENT";
            const isToday =
              formatIstanbulDateInput(lesson.startsAt) ===
              formatIstanbulDateInput(now);
            const completed = lesson.status === "COMPLETED";

            const cancelled = lesson.status === "CANCELLED";
            const ended = lesson.endsAt.getTime() < now.getTime();

            const statusLabel = missed
              ? "Telafi bekliyor"
              : cancelled
                ? "İptal edildi"
                : completed
                  ? "Tamamlandı"
                  : isToday
                    ? "Bugün"
                    : "Yaklaşıyor";

            const actionLabel = missed
              ? "Telafi et"
              : cancelled
                ? "Detay"
                : completed
                  ? "Notları gör"
                  : isToday && !ended
                    ? "Derse katıl"
                    : "Detay";
            const actionHref = missed
              ? `/panel/ogrenci/telafi?lessonId=${lesson.id}`
              : `/panel/ogrenci/takvim/${lesson.id}`;

            return (
              <PanelTableRow key={lesson.id}>
                <PanelTableCell>
                  <span className="block text-[13.5px] font-bold text-dc-ink">
                    {DATE.format(lesson.startsAt)}
                  </span>
                  <span className="block text-[12.5px] text-dc-ink-faint">
                    {TIME.format(lesson.startsAt)}
                  </span>
                </PanelTableCell>
                <PanelTableCell>
                  {lesson.title}
                  {lesson.group.name ? ` · ${lesson.group.name}` : ""}
                </PanelTableCell>
                <PanelTableCell>
                  {lesson.teacher.fullName || "—"}
                </PanelTableCell>
                <PanelTableCell>
                  <StatusBadge
                    label={statusLabel}
                    tone={
                      missed
                        ? "warning"
                        : cancelled
                          ? "neutral"
                          : completed
                            ? "success"
                            : isToday
                              ? "info"
                              : "neutral"
                    }
                  />
                </PanelTableCell>
                <PanelTableCell>
                  <Link
                    href={actionHref}
                    className="text-[13px] font-semibold text-dc-brand-strong hover:text-dc-brand-hover"
                  >
                    {actionLabel}
                  </Link>
                </PanelTableCell>
              </PanelTableRow>
            );
          })}
        </PanelTable>
      )}
    </>,
  );
}
