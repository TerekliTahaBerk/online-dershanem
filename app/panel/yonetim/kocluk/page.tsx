import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { planningWeekStart } from "@/lib/adaptive-plan";
import { addIstanbulCalendarDays } from "@/lib/istanbul-time";
import { coachingOverdue } from "@/lib/coaching";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  PanelCard,
  PanelCardTitle,
  PanelHeading,
  PanelEmpty,
  PanelStatCard,
  PanelTable,
  PanelTableRow,
  PanelTableCell,
} from "@/components/panel/ui";
import { assignCoach } from "./actions";

export const dynamic = "force-dynamic";

/**
 * ADMIN · KOÇLUK OPERASYONU — onaylı tasarım (Panel.dc.html → aCoach).
 *
 * Tasarımın üç sayacı ve "müdahale bekleyenler" listesi, hepsi gerçek veriden:
 *  - koç atanmayan öğrenci: Online Koçum ürünü OLAN ama aktif ataması olmayan,
 *  - görüşmesi geciken: `coachingOverdue` kuralı (tek yerde, test edilmiş),
 *  - kapasitesi aşan koç: aktif atama sayısı > `coachCapacity`.
 *
 * "Koç ata" ve "Devret" aynı server action'a bağlıdır; veritabanındaki kısmi
 * tekil indeks bir öğrenciye iki aktif koç bağlanmasını zaten reddeder.
 */

const DATE = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });

export default async function AdminCoachingPage() {
  const session = await requireRole("ADMIN");
  const adaptivePlanEnabled = getPanelFeatureFlags().adaptivePlan;
  const thisWeekStart = planningWeekStart();
  const thisWeekEnd = addIstanbulCalendarDays(thisWeekStart, 7);

  const [assignments, coaches, unassigned, recentSessions, studentsWithoutPlan, studentsWithoutGoals] = await Promise.all([
    prisma.coachAssignment.findMany({
      where: { endedAt: null },
      select: {
        id: true,
        cadenceDays: true,
        student: { select: { id: true, user: { select: { fullName: true, email: true } } } },
        coach: {
          select: {
            id: true,
            coachCapacity: true,
            user: { select: { fullName: true, email: true } },
          },
        },
        sessions: {
          orderBy: { scheduledAt: "desc" },
          select: { status: true, scheduledAt: true, completedAt: true },
        },
      },
    }),
    prisma.teacherProfile.findMany({
      where: { isCoach: true },
      select: {
        id: true,
        coachCapacity: true,
        user: { select: { fullName: true, email: true } },
        _count: { select: { coachAssignments: { where: { endedAt: null } } } },
      },
      orderBy: { user: { fullName: "asc" } },
    }),
    // Koçluk ürünü olan ama aktif koçu olmayan öğrenciler.
    prisma.studentProfile.findMany({
      where: {
        coachAssignments: { none: { endedAt: null } },
        user: {
          status: "ACTIVE",
          productMemberships: {
            some: {
              product: "OK",
              revokedAt: null,
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
          },
        },
      },
      select: { id: true, user: { select: { fullName: true, email: true } } },
      orderBy: { user: { fullName: "asc" } },
    }),
    prisma.coachingSession.findMany({
      where: { status: "COMPLETED", assignment: { endedAt: null } },
      orderBy: { completedAt: "desc" },
      take: 8,
      select: {
        id: true,
        completedAt: true,
        focus: true,
        assignment: {
          select: {
            student: { select: { id: true, user: { select: { fullName: true, email: true } } } },
            coach: { select: { user: { select: { fullName: true, email: true } } } },
          },
        },
      },
    }),
    prisma.coachAssignment.findMany({
      where: {
        endedAt: null,
        student: {
          weeklyPlans: {
            none: {
              weekStart: { gte: thisWeekStart, lt: thisWeekEnd },
              status: { in: ["DRAFT", "APPROVED", "CHANGE_REQUESTED"] },
            },
          },
        },
      },
      orderBy: { student: { user: { fullName: "asc" } } },
      take: 12,
      select: {
        id: true,
        student: { select: { id: true, user: { select: { fullName: true, email: true } } } },
        coach: { select: { user: { select: { fullName: true, email: true } } } },
      },
    }),
    prisma.coachAssignment.findMany({
      where: {
        endedAt: null,
        student: { goals: { none: { archivedAt: null } } },
      },
      orderBy: { student: { user: { fullName: "asc" } } },
      take: 12,
      select: {
        id: true,
        student: { select: { id: true, user: { select: { fullName: true, email: true } } } },
        coach: { select: { user: { select: { fullName: true, email: true } } } },
      },
    }),
  ]);

  const rows = assignments.map((a) => {
    const lastCompleted =
      a.sessions.filter((s) => s.status === "COMPLETED")[0]?.completedAt ?? null;
    const next =
      a.sessions
        .filter((s) => s.status === "PLANNED")
        .sort((x, y) => x.scheduledAt.getTime() - y.scheduledAt.getTime())[0]?.scheduledAt ??
      null;
    const { overdue, overdueDays } = coachingOverdue(lastCompleted, next, a.cadenceDays);
    return {
      id: a.id,
      studentId: a.student.id,
      studentName: a.student.user.fullName || a.student.user.email,
      coachName: a.coach.user.fullName || a.coach.user.email,
      lastCompleted,
      next,
      overdue,
      overdueDays,
    };
  });

  const overCapacity = coaches.filter(
    (c) => c.coachCapacity !== null && c._count.coachAssignments > c.coachCapacity,
  );
  const overdueRows = rows.filter((r) => r.overdue);
  const coachOptions = coaches.map((c) => ({
    id: c.id,
    name: c.user.fullName || c.user.email,
  }));

  /* Müdahale listesi: önce koçsuzlar, sonra gecikenler. */
  const interventions = [
    ...unassigned.map((s) => ({
      key: `u-${s.id}`,
      studentId: s.id,
      studentName: s.user.fullName || s.user.email,
      coachName: null as string | null,
      when: null as Date | null,
      issue: "Koç atanmadı",
      tone: "warn" as const,
    })),
    ...overdueRows.map((r) => ({
      key: `o-${r.id}`,
      studentId: r.studentId,
      studentName: r.studentName,
      coachName: r.coachName,
      when: r.next ?? r.lastCompleted,
      issue: r.overdueDays !== null ? `Görüşme ${r.overdueDays} gün gecikti` : "Görüşme gecikti",
      tone: "warn" as const,
    })),
  ];

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Koçluk operasyonu"
    >
      <div className="max-w-[1040px]">
        <PanelHeading
          title="Koçluk operasyonu"
          description={`${rows.length} koçluk öğrencisi · ${overdueRows.length} görüşme gecikti · ${unassigned.length} öğrenciye koç atanmadı`}
        />

        <div className="mt-[22px] grid gap-5 sm:grid-cols-3">
          <PanelStatCard title="Koç atanmayan öğrenci" value={String(unassigned.length)} />
          <PanelStatCard title="Görüşmesi geciken" value={String(overdueRows.length)} />
          <PanelStatCard title="Kapasitesi aşan koç" value={String(overCapacity.length)} />
        </div>

        {!adaptivePlanEnabled ? (
          <PanelCard className="mt-5">
            <PanelCardTitle>Uyarlanabilir plan şu anda kapalı</PanelCardTitle>
            <p className="mt-2 text-[13.5px] leading-[1.7] text-dc-ink-muted">
              Koç atama, görüşme takibi ve hedef operasyonu aktif kalır. Haftalık plan üretme/onaylama ekranları pilot yeniden açıldığında otomatik genişler.
            </p>
          </PanelCard>
        ) : null}

        {/* ── Müdahale bekleyenler ── */}
        <PanelCard className="mt-5" padded={false}>
          <div className="px-5 py-4">
            <PanelCardTitle>Müdahale bekleyenler</PanelCardTitle>
          </div>
          {interventions.length === 0 ? (
            <p className="px-5 pb-5 text-[13.5px] text-dc-ink-muted">
              Koçsuz öğrenci ya da gecikmiş görüşme yok.
            </p>
          ) : (
            <PanelTable
              caption="Koçluk müdahale listesi"
              columns={["Öğrenci", "Koç", "Son / sonraki görüşme", "Sorun", "Aksiyon"]}
            >
              {interventions.map((row) => (
                <PanelTableRow key={row.key}>
                  <PanelTableCell>
                    <span className="text-[14px] font-bold text-dc-ink">{row.studentName}</span>
                  </PanelTableCell>
                  <PanelTableCell tone={row.coachName ? undefined : "warn"}>
                    {row.coachName ?? "Atanmadı"}
                  </PanelTableCell>
                  <PanelTableCell>{row.when ? DATE.format(row.when) : "—"}</PanelTableCell>
                  <PanelTableCell tone={row.tone}>{row.issue}</PanelTableCell>
                  <PanelTableCell>
                    {coachOptions.length === 0 ? (
                      <span className="text-[12.5px] text-dc-ink-faint">Koç yok</span>
                    ) : (
                      <form action={assignCoach} className="flex flex-wrap items-center gap-1.5">
                        <input type="hidden" name="studentId" value={row.studentId} />
                        <label className="sr-only" htmlFor={`coach-${row.key}`}>
                          {row.studentName} için koç
                        </label>
                        <select
                          id={`coach-${row.key}`}
                          name="coachId"
                          required
                          className="rounded-lg border border-[#DDE4E0] bg-white px-2.5 py-1.5 text-[12.5px] font-semibold text-dc-ink"
                        >
                          {coachOptions.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <label className="sr-only" htmlFor={`cadence-${row.key}`}>
                          Görüşme sıklığı (gün)
                        </label>
                        <input
                          id={`cadence-${row.key}`}
                          name="cadenceDays"
                          type="number"
                          min={1}
                          placeholder="gün"
                          className="w-[68px] rounded-lg border border-[#DDE4E0] bg-white px-2 py-1.5 text-[12.5px] text-dc-ink"
                        />
                        <button
                          type="submit"
                          className="rounded-lg border border-[#DDE4E0] bg-white px-2.5 py-1.5 text-[12.5px] font-bold text-dc-ink transition-colors hover:border-dc-brand"
                        >
                          {row.coachName ? "Devret" : "Koç ata"}
                        </button>
                      </form>
                    )}
                  </PanelTableCell>
                </PanelTableRow>
              ))}
            </PanelTable>
          )}
        </PanelCard>

        {/* ── Koç yükü ── */}
        <PanelCard className="mt-5">
          <PanelCardTitle>Koç yükü</PanelCardTitle>
          {coaches.length === 0 ? (
            <PanelEmpty
              title="Koç olarak işaretli personel yok."
              body="Bir eğitmeni koç yapmak için kişi detayından koçluk bilgisini işaretleyin."
            />
          ) : (
            <ul className="mt-3.5 flex flex-col gap-2.5">
              {coaches.map((c) => {
                const load = c._count.coachAssignments;
                const over = c.coachCapacity !== null && load > c.coachCapacity;
                return (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 text-[14px] font-medium text-dc-ink-body"
                  >
                    <span>{c.user.fullName || c.user.email}</span>
                    <span className={over ? "text-[#C2493D]" : "text-dc-ink-muted"}>
                      {load}
                      {c.coachCapacity !== null ? ` / ${c.coachCapacity} öğrenci` : " öğrenci"}
                      {over ? " · aşıldı" : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </PanelCard>

        <PanelCard className="mt-5">
          <PanelCardTitle>Son tamamlanan görüşmeler</PanelCardTitle>
          {recentSessions.length === 0 ? (
            <p className="mt-3 text-[13.5px] text-dc-ink-muted">
              Henüz tamamlanmış koç görüşmesi kaydı yok.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5 text-[13.5px] leading-[1.7] text-dc-ink-body">
              {recentSessions.map((row) => {
                const studentName =
                  row.assignment.student.user.fullName || row.assignment.student.user.email;
                const coachName = row.assignment.coach.user.fullName || row.assignment.coach.user.email;
                return (
                  <li key={row.id} className="rounded-[10px] border border-dc-line-soft bg-white px-3.5 py-3">
                    <p className="font-semibold text-dc-ink">
                      {studentName} · {coachName}
                    </p>
                    <p className="mt-1 text-dc-ink-muted">
                      {row.completedAt ? DATE.format(row.completedAt) : "Tarih yok"}
                      {row.focus ? ` · odak: ${row.focus}` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </PanelCard>

        <PanelCard className="mt-5">
          <PanelCardTitle>Bu hafta planı olmayan koçluk öğrencileri</PanelCardTitle>
          {!adaptivePlanEnabled ? (
            <p className="mt-3 text-[13.5px] text-dc-ink-muted">
              Plan pilotu kapalı olduğu için bu kontrol şu an beklemede.
            </p>
          ) : studentsWithoutPlan.length === 0 ? (
            <p className="mt-3 text-[13.5px] text-dc-ink-muted">
              Aktif koçluk öğrencilerinin bu hafta için plan kaydı var.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2 text-[13.5px] text-dc-ink-body">
              {studentsWithoutPlan.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-dc-line-soft bg-white px-3.5 py-3">
                  <span>
                    <strong>{row.student.user.fullName || row.student.user.email}</strong> ·{" "}
                    {row.coach.user.fullName || row.coach.user.email}
                  </span>
                  <Link
                    href={`/panel/yonetim/ogrenciler?q=${encodeURIComponent(row.student.user.fullName || row.student.user.email)}`}
                    className="text-[12.5px] font-semibold text-dc-brand hover:underline"
                  >
                    Öğrenciyi aç
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard className="mt-5">
          <PanelCardTitle>Hedefi olmayan koçluk öğrencileri</PanelCardTitle>
          {studentsWithoutGoals.length === 0 ? (
            <p className="mt-3 text-[13.5px] text-dc-ink-muted">
              Aktif koçluk öğrencilerinin hepsinde en az bir hedef tanımlı.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2 text-[13.5px] text-dc-ink-body">
              {studentsWithoutGoals.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-dc-line-soft bg-white px-3.5 py-3">
                  <span>
                    <strong>{row.student.user.fullName || row.student.user.email}</strong> ·{" "}
                    {row.coach.user.fullName || row.coach.user.email}
                  </span>
                  <Link
                    href={`/panel/yonetim/ogrenciler?q=${encodeURIComponent(row.student.user.fullName || row.student.user.email)}`}
                    className="text-[12.5px] font-semibold text-dc-brand hover:underline"
                  >
                    Öğrenciyi aç
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <p className="mt-5 text-[12.5px] text-dc-ink-faint">
          Koçluk görüşmelerinin kendisi eğitmen panelinden kaydedilir.{" "}
          <Link href="/panel/yonetim/kullanicilar?rol=TEACHER" className="font-semibold text-dc-brand hover:underline">
            Eğitmenleri aç
          </Link>
        </p>
      </div>
    </PanelShell>
  );
}
