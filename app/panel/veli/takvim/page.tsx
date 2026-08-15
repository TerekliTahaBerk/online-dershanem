import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/auth/guards";
import { resolveParentScope } from "@/lib/panel/parent-scope";
import { PanelShell } from "@/components/panel/panel-shell";
import { ChildSwitcher } from "@/components/panel/parent/child-switcher";
import {
  PanelHeading,
  PanelCard,
  PanelTable,
  PanelTableRow,
  PanelTableCell,
  PanelEmpty,
} from "@/components/panel/ui";

export const dynamic = "force-dynamic";

/**
 * VELİ · DERSLER — onaylı tasarım (Panel.dc.html → pLessons).
 *
 * Tasarımın işlev tanımı: tarih / ders ve konu / öğretmen / katılım tablosu,
 * altında "Son dersin özeti" ve gizlilik notu.
 *
 * GİZLİLİK: yalnızca ORTAK ders notu (`studentId: null`) okunur. Öğretmenin
 * öğrenciye özel notu sorguya HİÇ girmez — veliye sızma ihtimali kalmaz.
 */

const DAY = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });

export default async function ParentLessonsPage({
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
      pageTitle="Dersler"
      topbarSlot={
        <ChildSwitcher
          options={children}
          selectedId={selected?.id ?? null}
          basePath="/panel/veli/takvim"
        />
      }
    >
      <div className="max-w-[1000px]">{body}</div>
    </PanelShell>
  );

  if (!selected) {
    return shell(
      <>
        <PanelHeading title="Dersler" />
        <PanelEmpty
          title="Henüz bağlı öğrenci yok."
          body="Hesabınız öğrencinizle eşleştirildiğinde ders takvimi burada görünür."
        />
      </>,
    );
  }

  if (!selected.products.includes("OD")) {
    return shell(
      <>
        <PanelHeading title="Dersler" description={selected.name} />
        <PanelEmpty
          title="Bu hesapta canlı ders ürünü bulunmuyor."
          body="Online Dershanem eklendiğinde ders takvimi ve katılım burada görünür."
        />
      </>,
    );
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: selected.id, endedAt: null },
    select: { groupId: true },
  });
  const groupIds = enrollments.map((e) => e.groupId);

  const lessons = groupIds.length
    ? await prisma.lesson.findMany({
        where: { groupId: { in: groupIds } },
        orderBy: { startsAt: "desc" },
        take: 30,
        include: {
          teacher: { select: { fullName: true } },
          // Yalnız ortak not — öğrenciye özel not okunmaz.
          notes: { where: { studentId: null }, take: 1 },
          attendances: { where: { studentId: selected.id }, select: { status: true } },
        },
      })
    : [];

  const lastWithSummary = lessons.find((l) => l.notes[0]?.topic);

  return shell(
    <>
      <PanelHeading title="Dersler" description={selected.name} />

      {lessons.length === 0 ? (
        <PanelEmpty
          title="Henüz ders kaydı yok."
          body="Dersler planlandıkça tarih, öğretmen ve katılım bilgisi burada listelenir."
        />
      ) : (
        <>
          <PanelTable
            caption={`${selected.name} ders listesi`}
            columns={["Tarih", "Ders ve konu", "Öğretmen", "Katılım"]}
          >
            {lessons.map((lesson) => {
              const status = lesson.attendances[0]?.status;
              const label =
                status === "ABSENT"
                  ? "Katılmadı"
                  : status === "LATE"
                    ? "Geç katıldı"
                    : status === "PRESENT"
                      ? "Katıldı"
                      : status === "EXCUSED"
                        ? "Mazeretli"
                        : "İşlenmedi";
              return (
                <PanelTableRow key={lesson.id}>
                  <PanelTableCell>{DAY.format(lesson.startsAt)}</PanelTableCell>
                  <PanelTableCell>
                    {lesson.title}
                    {lesson.notes[0]?.topic ? ` · ${lesson.notes[0].topic}` : ""}
                  </PanelTableCell>
                  <PanelTableCell>{lesson.teacher.fullName || "—"}</PanelTableCell>
                  <PanelTableCell tone={status === "ABSENT" ? "warn" : "ok"}>
                    {label}
                  </PanelTableCell>
                </PanelTableRow>
              );
            })}
          </PanelTable>

          <PanelCard className="mt-5 max-w-[760px]">
            <h2 className="text-[15px] font-bold text-dc-ink">Son dersin özeti</h2>
            <p className="mt-2 text-[14.5px] leading-[1.65] text-[var(--pd-ink-3)]">
              {lastWithSummary?.notes[0]?.topic ||
                "Öğretmen henüz ders özeti eklemedi. Eklendiğinde burada görünecek."}
            </p>
            <p className="mt-2.5 text-[12.5px] text-dc-ink-faint">
              Öğretmenin öğrenciye özel notları veliyle paylaşılmaz.
            </p>
          </PanelCard>
        </>
      )}
    </>,
  );
}
