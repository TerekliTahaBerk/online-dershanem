import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  PanelHeading,
  PanelFilterLink,
  PanelTable,
  PanelTableRow,
  PanelTableCell,
  PanelEmpty,
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

const DATE = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });
const TIME = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });

type Filter = "yaklasan" | "tamamlanan";

export default async function StudentLessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  const session = await requireRole("STUDENT");
  const filter: Filter = (await searchParams).durum === "tamamlanan" ? "tamamlanan" : "yaklasan";

  const profile = await prisma.studentProfile.findUnique({ where: { userId: session.userId } });

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
          title="Profilin hazırlanıyor."
          body="Öğrenci profilin tamamlandığında ders takvimin burada görünecek."
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
          attendances: { where: { studentId: profile.id }, select: { status: true } },
        },
      })
    : [];

  const groupNames = [...new Set(enrollments.map((e) => e.group.name))].join(" · ");

  return shell(
    <>
      <PanelHeading
        title="Derslerin"
        description={groupNames || undefined}
        actions={
          <>
            <PanelFilterLink href="/panel/ogrenci/takvim" active={filter === "yaklasan"}>
              Yaklaşan
            </PanelFilterLink>
            <PanelFilterLink
              href="/panel/ogrenci/takvim?durum=tamamlanan"
              active={filter === "tamamlanan"}
            >
              Tamamlanan
            </PanelFilterLink>
          </>
        }
      />

      {lessons.length === 0 ? (
        <PanelEmpty
          title={filter === "yaklasan" ? "Yaklaşan ders yok." : "Tamamlanmış ders yok."}
          body={
            filter === "yaklasan"
              ? "Yeni dersin planlandığında burada görünecek."
              : "Ders tamamlandıkça öğretmen notlarıyla birlikte burada listelenir."
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
            const isToday = lesson.startsAt.toDateString() === now.toDateString();
            const completed = lesson.status === "COMPLETED";

            const statusLabel = missed
              ? "Katılmadın"
              : completed
                ? "Tamamlandı"
                : isToday
                  ? "Bugün"
                  : lesson.status === "CANCELLED"
                    ? "İptal edildi"
                    : "Yaklaşıyor";

            const actionLabel = missed
              ? "Telafi"
              : completed
                ? "Notları gör"
                : isToday
                  ? "Derse katıl"
                  : "Detay";

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
                <PanelTableCell>{lesson.teacher.fullName || "—"}</PanelTableCell>
                <PanelTableCell tone={missed ? "warn" : isToday && !completed ? "ok" : "default"}>
                  {statusLabel}
                </PanelTableCell>
                <PanelTableCell>
                  <Link
                    href={`/panel/ogrenci/takvim/${lesson.id}`}
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
