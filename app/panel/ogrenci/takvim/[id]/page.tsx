import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelHeading, PanelCard } from "@/components/panel/ui";

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

  const profile = await prisma.studentProfile.findUnique({ where: { userId: session.userId } });
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
      notes: { where: { OR: [{ studentId: null }, { studentId: profile.id }] } },
      attendances: { where: { studentId: profile.id }, select: { status: true } },
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
    include: { progress: { where: { studentId: profile.id }, select: { status: true } } },
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
      <div className="max-w-[900px]">
        <PanelHeading
          eyebrow={`Dersler · ${FULL.format(lesson.startsAt)}`}
          title={lesson.title}
        />

        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-b border-dc-line pb-5 text-[14px] font-medium text-[var(--pd-ink-3)]">
          <span>Öğretmen: {lesson.teacher.fullName || "—"}</span>
          <span>Grup: {lesson.group.name}</span>
          <span className={attendance === "ABSENT" ? "text-[#8A5F37]" : "text-dc-brand-hover"}>
            {attendanceLabel}
          </span>
        </div>

        <section className="mt-6">
          <h2 className="text-[16px] font-bold text-dc-ink">Derste ne işlendi?</h2>
          <p className="mt-2 text-[14.5px] leading-[1.7] text-[var(--pd-ink-3)]">
            {shared?.topic ||
              "Öğretmen bu dersin özetini henüz eklemedi. Eklendiğinde burada görünecek."}
          </p>
        </section>

        {personal?.note ? (
          <section className="mt-6">
            <h2 className="text-[16px] font-bold text-dc-ink">Öğretmen notu</h2>
            <PanelCard className="mt-2">
              <p className="text-[14.5px] leading-[1.65] text-[var(--pd-ink-3)]">
                &ldquo;{personal.note}&rdquo;
              </p>
            </PanelCard>
          </section>
        ) : null}

        <section className="mt-6">
          <h2 className="text-[16px] font-bold text-dc-ink">Verilen çalışma</h2>
          {shared?.homework ? (
            <p className="mt-2 text-[14.5px] leading-[1.7] text-[var(--pd-ink-3)]">
              {shared.homework}
            </p>
          ) : null}

          {assignments.length ? (
            <div className="mt-2 flex flex-col gap-2.5">
              {assignments.map((a) => {
                const done = a.progress[0]?.status === "DONE";
                return (
                  <PanelCard key={a.id} className="flex flex-wrap items-center gap-4">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-semibold text-dc-ink">
                        {a.title}
                      </span>
                      <span className="mt-0.5 block text-[13px] text-dc-ink-faint">
                        {a.dueAt
                          ? `Teslim: ${new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" }).format(a.dueAt)}`
                          : "Teslim tarihi yok"}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 text-[13.5px] font-semibold ${
                        done ? "text-dc-brand-hover" : "text-dc-ink-muted"
                      }`}
                    >
                      {done ? "✓ Tamamlandı" : "Bekliyor"}
                    </span>
                  </PanelCard>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-[14.5px] text-dc-ink-muted">
              Bu ders için çalışma verilmedi.
            </p>
          )}
        </section>

        {shared?.nextGoal ? (
          <section className="mt-6">
            <h2 className="text-[16px] font-bold text-dc-ink">Sonraki hedef</h2>
            <p className="mt-2 text-[14.5px] leading-[1.7] text-[var(--pd-ink-3)]">
              {shared.nextGoal}
            </p>
          </section>
        ) : null}

        <p className="mt-4 text-[12.5px] leading-[1.6] text-dc-ink-faint">
          Bu dersin veliye açık özeti: işlenen konu, katılım ve verilen çalışma.
          Öğretmenin sana özel notu veliyle paylaşılmaz.
        </p>
      </div>
    </PanelShell>
  );
}
