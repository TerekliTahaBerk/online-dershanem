import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  List,
  ListRow,
  PageHeader,
  PropertyList,
  PropertyRow,
  Section,
  StatusBadge,
} from "@/components/panel/ui";

export const dynamic = "force-dynamic";

/**
 * ÖĞRENCİ · DERS DETAYI — onaylı tasarım (Panel.dc.html → sLessonDetail).
 *
 * Tasarımın işlev tanımı: üst bilgi (öğretmen, format, katılım), "Derste ne
 * işlendi?", "Öğretmen notu", "Verilen çalışma", "Sonraki hedef", Dino
 * çıkarımı ve en altta veli görünürlüğü kuralı.
 *
 * GİZLİLİK: öğretmenin ÖĞRENCİYE ÖZEL notu (studentId dolu) yalnız bu
 * öğrenciye gösterilir; veliye açık özet işlenen konu, katılım ve verilen
 * çalışmadır. Sorgu zaten `studentId: null | profile.id` ile sınırlıdır —
 * başka öğrencinin özel notu hiçbir koşulda çekilmez.
 */

const FULL = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function StudentLessonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("STUDENT");
  const { id } = await params;

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.userId },
  });
  if (!profile) notFound();

  // Öğrencinin kayıtlı olduğu grupların dersleri dışına çıkılamaz.
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: profile.id },
    select: { groupId: true },
  });
  const groupIds = enrollments.map((e) => e.groupId);

  const lesson = await prisma.lesson.findFirst({
    where: { id, groupId: { in: groupIds } },
    include: {
      group: { select: { name: true } },
      teacher: { select: { fullName: true } },
      notes: {
        where: { OR: [{ studentId: null }, { studentId: profile.id }] },
      },
      attendances: {
        where: { studentId: profile.id },
        select: { status: true },
      },
    },
  });
  if (!lesson) notFound();

  const shared = lesson.notes.find((n) => n.studentId === null);
  const personal = lesson.notes.find((n) => n.studentId === profile.id);
  const attendance = lesson.attendances[0]?.status;

  const assignments = await prisma.assignment.findMany({
    where: { groupId: lesson.groupId, isActive: true },
    orderBy: { dueAt: "desc" },
    take: 3,
    include: {
      progress: { where: { studentId: profile.id }, select: { status: true } },
    },
  });

  const attendanceLabel =
    attendance === "PRESENT"
      ? "Katıldın"
      : attendance === "LATE"
        ? "Geç katıldın"
        : attendance === "ABSENT"
          ? "Katılmadın"
          : attendance === "EXCUSED"
            ? "Mazeretli"
            : "Katılım işlenmedi";

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Ders detayı"
    >
      <div className="max-w-[760px]">
        <PageHeader eyebrow="Dersler" title={lesson.title} />

        <PropertyList className="mt-5">
          <PropertyRow label="Tarih">{FULL.format(lesson.startsAt)}</PropertyRow>
          <PropertyRow label="Öğretmen">{lesson.teacher.fullName || "—"}</PropertyRow>
          <PropertyRow label="Grup">{lesson.group.name}</PropertyRow>
          <PropertyRow label="Katılım">
            <StatusBadge
              label={attendanceLabel}
              tone={
                attendance === "ABSENT"
                  ? "warning"
                  : attendance === "PRESENT" || attendance === "LATE"
                    ? "success"
                    : "neutral"
              }
            />
          </PropertyRow>
        </PropertyList>

        <Section title="Derste ne işlendi?">
          <p className="text-[14.5px] leading-[1.7] text-pn-text-secondary">
            {shared?.topic ||
              "Öğretmen bu dersin özetini henüz eklemedi. Eklendiğinde burada görünecek."}
          </p>
        </Section>

        {personal?.note ? (
          <Section title="Öğretmen notu">
            <blockquote className="border-l-2 border-pn-accent pl-4 text-[14.5px] leading-[1.65] text-pn-text-secondary">
              &ldquo;{personal.note}&rdquo;
            </blockquote>
          </Section>
        ) : null}

        <Section title="Verilen çalışma">
          {shared?.homework ? (
            <p className="mb-3 text-[14.5px] leading-[1.7] text-pn-text-secondary">{shared.homework}</p>
          ) : null}
          {assignments.length ? (
            <List label="Bu derste verilen çalışmalar">
              {assignments.map((a) => {
                const done = a.progress[0]?.status === "DONE";
                return (
                  <ListRow
                    key={a.id}
                    title={a.title}
                    href="/panel/ogrenci/odevler"
                    meta={
                      a.dueAt
                        ? `Teslim: ${new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" }).format(a.dueAt)}`
                        : "Teslim tarihi yok"
                    }
                    status={<StatusBadge label={done ? "Tamamlandı" : "Bekliyor"} tone={done ? "success" : "neutral"} />}
                  />
                );
              })}
            </List>
          ) : (
            <p className="text-[14.5px] text-pn-text-muted">Bu ders için çalışma verilmedi.</p>
          )}
        </Section>

        {shared?.nextGoal ? (
          <Section title="Sonraki hedef">
            <p className="text-[14.5px] leading-[1.7] text-pn-text-secondary">{shared.nextGoal}</p>
          </Section>
        ) : null}

        <p className="mt-8 border-t border-pn-border pt-4 text-[12.5px] leading-[1.6] text-pn-text-muted">
          Bu dersin veliye açık özeti: işlenen konu, katılım ve verilen çalışma.
          Öğretmenin sana özel notu veliyle paylaşılmaz.
        </p>
      </div>
    </PanelShell>
  );
}
