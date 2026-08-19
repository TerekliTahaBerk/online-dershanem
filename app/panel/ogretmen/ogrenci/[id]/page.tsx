import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { resolveTeacherStudent } from "@/lib/panel/teacher-scope";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelCard, PanelCardTitle, PanelHeading } from "@/components/panel/ui";

export const dynamic = "force-dynamic";

/**
 * EĞİTMEN · ÖĞRENCİ DETAYI — onaylı tasarım (Panel.dc.html → eStudent).
 *
 * GÜVENLİK: öğrenci `resolveTeacherStudent` ile çözülür — öğretmen yalnız
 * kendi aktif gruplarındaki öğrenciyi açabilir, aksi hâlde 404.
 *
 * GİZLİLİK (§27 — güvenlik görsel birebirliğin önünde):
 *  - "Kendi notların" kartı YALNIZ bu öğretmenin kendi derslerinde yazdığı
 *    notları gösterir; başka öğretmenin notu buraya düşmez.
 *  - Deneme sinyalleri öğretmenin DERS VERDİĞİ derslerle sınırlandırılır;
 *    tasarımdaki "matematik bölümüyle sınırlı görüntüleme" notu da bunu söyler.
 */

const DAY = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });

const ATTENDANCE_LABEL = {
  PRESENT: "katıldı",
  ABSENT: "katılmadı",
  LATE: "geç katıldı",
  EXCUSED: "izinli",
} as const;

function pct(done: number, total: number): number | null {
  if (total === 0) return null;
  return Math.round((done / total) * 100);
}

export default async function TeacherStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("TEACHER");
  const { id } = await params;
  const student = await resolveTeacherStudent(session.userId, id);
  /* Koçluk hazırlığı yalnız adaptif plan açıkken anlamlı — kapalıysa bağlantı basılmaz. */
  const coachingEnabled = getPanelFeatureFlags().adaptivePlan;

  const groupIds = student.groups.map((g) => g.id);
  /* Öğretmenin ders verdiği alanlar — deneme sinyali bununla sınırlanır. */
  const subjects = [...new Set(student.groups.map((g) => g.subject))];

  const [attendances, notes, assignments, examSections] = await Promise.all([
    prisma.attendance.findMany({
      where: { studentId: student.id, lesson: { groupId: { in: groupIds } } },
      select: {
        status: true,
        lesson: { select: { title: true, startsAt: true } },
      },
      orderBy: { lesson: { startsAt: "desc" } },
      take: 8,
    }),
    // Yalnız bu öğretmenin kendi derslerindeki, bu öğrenciye özel notlar.
    prisma.lessonNote.findMany({
      where: { studentId: student.id, lesson: { teacherId: session.userId } },
      select: { note: true, topic: true, nextGoal: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 3,
    }),
    prisma.assignmentProgress.findMany({
      where: { studentId: student.id, assignment: { groupId: { in: groupIds } } },
      select: { status: true },
    }),
    prisma.mockExamSection.findMany({
      where: {
        mockExam: { studentId: student.id },
        // Öğretmenin alanı dışındaki bölümler getirilmez.
        subjectName: { in: subjects },
      },
      select: {
        subjectName: true,
        correctCount: true,
        incorrectCount: true,
        mockExam: { select: { takenAt: true } },
      },
      orderBy: { mockExam: { takenAt: "desc" } },
      take: 3,
    }),
  ]);

  const present = attendances.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
  const doneCount = assignments.filter((a) => a.status === "DONE").length;
  const homeworkPct = pct(doneCount, assignments.length);
  const lastTopic = notes.find((n) => n.topic)?.topic ?? null;
  const nextGoal = notes.find((n) => n.nextGoal)?.nextGoal ?? null;
  const latestNote = notes.find((n) => n.note)?.note ?? null;

  /* Net = doğru − yanlış/4 (TYT/AYT kuralı), gerçek bölüm verisinden. */
  const nets = examSections.map((s) => s.correctCount - s.incorrectCount / 4);
  const avgNet = nets.length
    ? (nets.reduce((a, b) => a + b, 0) / nets.length).toFixed(2).replace(".", ",")
    : null;

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Öğrenci detayı"
    >
      <div className="max-w-[960px]">
        <PanelHeading
          eyebrow="Öğrenciler · senin kapsamında"
          title={student.name}
          actions={
            coachingEnabled ? (
              <Link
                href={`/panel/ogretmen/hazirlik/${student.id}`}
                className="rounded-[10px] border border-[#DDE4E0] bg-white px-4 py-2.5 text-[13.5px] font-bold text-dc-ink transition-colors hover:border-dc-brand"
              >
                Görüşmeye hazırlan
              </Link>
            ) : null
          }
        />

        <div className="mt-3.5 flex flex-wrap gap-x-8 gap-y-2 border-b border-dc-line pb-5 text-[14px] font-medium text-dc-ink-body">
          {student.targetGoal ? <span>{student.targetGoal}</span> : null}
          {student.classLevel ? <span>{student.classLevel}</span> : null}
          <span>{student.groups.map((g) => g.name).join(", ")}</span>
          <span className="text-dc-brand-hover">
            Katılım {present} / {attendances.length}
          </span>
        </div>

        <div className="mt-[22px] grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          <PanelCard>
            <PanelCardTitle>Senin dersindeki durum</PanelCardTitle>
            <dl className="mt-3.5 flex flex-col gap-2.5 text-[14px] font-medium text-dc-ink-body">
              <div className="flex justify-between gap-3">
                <dt>Son işlenen konu</dt>
                <dd className="text-dc-ink-muted">{lastTopic ?? "Kayıt yok"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Ödev tamamlama</dt>
                <dd className="text-dc-ink-muted">
                  {homeworkPct === null ? "Ödev yok" : `%${homeworkPct}`}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Sonraki hedef</dt>
                <dd className="text-[#A5764A]">{nextGoal ?? "Belirlenmedi"}</dd>
              </div>
            </dl>

            <h3 className="mt-5 text-[15px] font-bold text-dc-ink">Ders geçmişi</h3>
            {attendances.length === 0 ? (
              <p className="mt-2.5 text-[13.5px] text-dc-ink-muted">
                Bu öğrenciyle henüz tamamlanmış ders kaydın yok.
              </p>
            ) : (
              <ul className="mt-2.5 text-[13.5px] leading-[1.9] text-dc-ink-muted">
                {attendances.map((a, i) => (
                  <li key={i}>
                    {DAY.format(a.lesson.startsAt)} · {a.lesson.title} ·{" "}
                    {ATTENDANCE_LABEL[a.status]}
                  </li>
                ))}
              </ul>
            )}
          </PanelCard>

          <div className="flex flex-col gap-4">
            <PanelCard>
              <PanelCardTitle>Deneme sinyalleri</PanelCardTitle>
              {avgNet === null ? (
                <p className="mt-2 text-[13.5px] leading-[1.7] text-dc-ink-body">
                  Senin ders alanında kayıtlı deneme bölümü yok.
                </p>
              ) : (
                <p className="mt-2 text-[13.5px] leading-[1.7] text-dc-ink-body">
                  Son {examSections.length} denemede {subjects.join(", ")} ortalama neti{" "}
                  {avgNet}.
                </p>
              )}
              <p className="mt-2 text-[12.5px] text-dc-ink-faint">
                Yalnız ders verdiğin alanla sınırlı görüntüleme.
              </p>
            </PanelCard>

            <PanelCard>
              <PanelCardTitle>Kendi notların</PanelCardTitle>
              {latestNote ? (
                <p className="mt-2.5 rounded-[10px] border border-[#DDE4E0] bg-[#FCFDFC] px-3.5 py-3 text-[14px] leading-[1.6] text-dc-ink-body">
                  {latestNote}
                </p>
              ) : (
                <p className="mt-2.5 text-[13.5px] text-dc-ink-muted">
                  Bu öğrenci için henüz not yazmadın.
                </p>
              )}
              <p className="mt-2 text-[12.5px] text-dc-ink-faint">
                Bu notlar yalnızca sana ve yöneticiye görünür; veliyle paylaşılmaz.
              </p>
            </PanelCard>
          </div>
        </div>
      </div>
    </PanelShell>
  );
}
