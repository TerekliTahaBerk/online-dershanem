import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelHeading, PanelCard, PanelCardTitle } from "@/components/panel/ui";
import { istanbulDayStart, istanbulNextDayStart } from "@/lib/istanbul-time";
import { getTeacherStudentAttentionSnapshot } from "@/lib/panel/teacher-attention-server";

export const dynamic = "force-dynamic";

/**
 * EĞİTMEN · BUGÜN — onaylı tasarım (Panel.dc.html → scEduHome).
 *
 * Tasarımın işlev tanımı: bugünün ders akışı (saat, ders/grup, öğrenci sayısı
 * ve konu, tek aksiyon), "Seni bekleyen işlemler" (not girişi bekleyen
 * dersler) ve "Takip edilmesi gereken öğrenciler".
 *
 * SIRALAMA KARAR VERMEZ: dikkat listesi canonical Student Support Episode
 * read-model'inden gelir. Ana sayfa ham ödev/katılım geçmişini yeniden
 * puanlamaz; bağlamı ve sonucu öğretmen belirler.
 */

const TIME = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });
const DAY = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });

export default async function TeacherHomePage() {
  const session = await requireRole("TEACHER");

  const now = new Date();
  const dayStart = istanbulDayStart(now);
  const dayEnd = istanbulNextDayStart(now);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [todayLessons, awaitingNotes, attentionSnapshot] = await Promise.all([
    prisma.lesson.findMany({
      where: { teacherId: session.userId, startsAt: { gte: dayStart, lt: dayEnd } },
      orderBy: { startsAt: "asc" },
      include: {
        group: { select: { name: true, enrollments: { where: { endedAt: null }, select: { id: true } } } },
        notes: { where: { studentId: null }, select: { id: true } },
      },
    }),
    // Geçmiş ama ortak ders notu girilmemiş dersler
    prisma.lesson.findMany({
      where: {
        teacherId: session.userId,
        startsAt: { lt: now, gte: twoWeeksAgo },
        notes: { none: { studentId: null } },
      },
      orderBy: { startsAt: "desc" },
      take: 6,
      include: { group: { select: { name: true } } },
    }),
    getTeacherStudentAttentionSnapshot(session.userId),
  ]);

  const summary = [
    todayLessons.length ? `${todayLessons.length} ders` : null,
    awaitingNotes.length ? `${awaitingNotes.length} ders için not girişi bekliyor` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Ana Sayfa"
    >
      <div className="max-w-[1040px]">
        <PanelHeading title="Bugün" description={summary || "Bugün planlanmış ders yok."} />

        <div className="mt-6 rounded-[14px] border border-dc-line bg-white">
          {todayLessons.length === 0 ? (
            <div className="px-[22px] py-[26px]">
              <p className="text-[15px] font-bold text-dc-ink">Bugün dersin yok.</p>
              <p className="mt-1.5 text-[14px] text-dc-ink-muted">
                Takvimindeki bir sonraki derse hazırlanabilir ya da bekleyen not girişlerini
                tamamlayabilirsin.
              </p>
            </div>
          ) : (
            <ul>
              {todayLessons.map((lesson, i) => (
                <li
                  key={lesson.id}
                  className={`flex flex-wrap items-center gap-5 px-[22px] py-4 ${
                    i < todayLessons.length - 1 ? "border-b border-dc-line-soft" : ""
                  }`}
                >
                  <span className="w-[60px] flex-none text-[14px] font-bold text-dc-ink">
                    {TIME.format(lesson.startsAt)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold text-dc-ink">
                      {lesson.title} · {lesson.group.name}
                    </span>
                    <span className="mt-0.5 block text-[13.5px] text-dc-ink-muted">
                      {lesson.group.enrollments.length} öğrenci
                    </span>
                  </span>
                  {/* Ders kapanışı ekranı — `/panel/ogretmen/odevler`e giden
                      eski bağlantı `?ders=` parametresini okumayan genel ödev
                      sayfasına düşüyordu, yani not girişi hiç yapılamıyordu. */}
                  <Link
                    href={`/panel/ogretmen/ders/${lesson.id}`}
                    className={`flex-none rounded-[10px] px-4 py-2.5 text-[13.5px] font-bold transition-colors ${
                      lesson.notes.length === 0 && lesson.startsAt < now
                        ? "bg-dc-brand-strong text-white hover:bg-dc-brand-hover"
                        : "border border-[#DDE4E0] bg-white text-dc-ink hover:border-dc-brand"
                    }`}
                  >
                    {lesson.notes.length === 0 && lesson.startsAt < now
                      ? "Ders sonrası"
                      : "Hazırlık"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <PanelCard>
            <PanelCardTitle>Seni bekleyen işlemler</PanelCardTitle>
            {awaitingNotes.length ? (
              <ul className="mt-3.5 flex flex-col gap-3 text-[14px] font-medium text-[var(--pd-ink-3)]">
                {awaitingNotes.map((lesson) => (
                  <li key={lesson.id} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate">
                      {lesson.group.name} · {DAY.format(lesson.startsAt)} dersi not girişi
                    </span>
                    <Link
                      href={`/panel/ogretmen/ders/${lesson.id}`}
                      className="shrink-0 text-[13.5px] font-bold text-dc-brand-strong hover:text-dc-brand-hover"
                    >
                      Gir
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[14px] text-dc-ink-muted">
                Bekleyen not girişin yok. Tüm dersler kapatılmış.
              </p>
            )}
          </PanelCard>

          <PanelCard>
            <PanelCardTitle>Takip edilmesi gereken öğrenciler</PanelCardTitle>
            {attentionSnapshot.length ? (
              <>
                <ul className="mt-3.5 flex flex-col gap-3.5">
                  {attentionSnapshot.map((flag) => (
                    <li key={flag.id}>
                      <p className="text-[14.5px] font-semibold text-dc-ink">
                        {flag.name} · {flag.group}
                      </p>
                      <p className="mt-1 text-[13.5px] leading-[1.55] text-dc-ink-muted">
                        {flag.reason}
                      </p>
                    </li>
                  ))}
                </ul>
                <p className="mt-3.5 text-[12.5px] text-dc-ink-faint">
                  Açık destek bölümleri 24 saat hedefiyle gösterilir. Kararı ve sonucu sen belirlersin.
                </p>
                <Link href="/panel/ogretmen/mudahale" className="mt-3 inline-flex text-[13px] font-bold text-dc-brand-strong hover:text-dc-brand-hover">Müdahale kutusuna git</Link>
              </>
            ) : (
              <p className="mt-3 text-[14px] text-dc-ink-muted">
                Şu an açık bir öğrenci destek bölümü yok.
              </p>
            )}
          </PanelCard>
        </div>
      </div>
    </PanelShell>
  );
}
