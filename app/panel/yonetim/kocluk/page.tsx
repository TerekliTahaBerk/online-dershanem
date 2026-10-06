import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { planningWeekStart } from "@/lib/adaptive-plan";
import { addIstanbulCalendarDays, formatIstanbulDateInput } from "@/lib/istanbul-time";
import { coachingOverdue } from "@/lib/coaching";
import { getManagementKocumSignals } from "@/lib/kocum/server";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  EmptyState,
  List,
  ListRow,
  PageHeader,
  PanelTable,
  PanelTableRow,
  PanelTableCell,
  Section,
  StatusBadge,
  UrlDrawer,
  ViewTabs,
  buttonClass,
} from "@/components/panel/ui";
import { assignCoach } from "./actions";
import { COACHING_QUEUES, type CoachingQueue } from "./queues";

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

const DATE = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
});

const ASSIGN_ERROR: Record<string, string> = {
  student: "Öğrenci bulunamadı.",
  coach: "Seçilen koç aktif değil ya da koç olarak işaretli değil.",
  membership: "Öğrencinin aktif Yön Koçluk üyeliği yok; koç atanamaz.",
  capacity: "Koç kapasitesi dolu. Kapasite aşımı için gerekçe yazın.",
};

export default async function AdminCoachingPage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string | string[]; kuyruk?: string | string[]; onizle?: string | string[]; atandi?: string | string[] }>;
}) {
  const session = await requireRole("ADMIN");
  const rawError = (await searchParams).hata;
  const assignError = typeof rawError === "string" ? ASSIGN_ERROR[rawError] ?? null : null;
  const adaptivePlanEnabled = getPanelFeatureFlags().adaptivePlan;
  const thisWeekStart = planningWeekStart();
  const thisWeekEnd = addIstanbulCalendarDays(thisWeekStart, 7);

  const [
    assignments,
    coaches,
    unassigned,
    recentSessions,
    studentsWithoutPlan,
    studentsWithoutGoals,
    kocumSignals,
  ] = await Promise.all([
    prisma.coachAssignment.findMany({
      where: { endedAt: null },
      select: {
        id: true,
        cadenceDays: true,
        student: {
          select: {
            id: true,
            user: { select: { fullName: true, email: true } },
          },
        },
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
            student: {
              select: {
                id: true,
                user: { select: { fullName: true, email: true } },
              },
            },
            coach: {
              select: { user: { select: { fullName: true, email: true } } },
            },
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
        student: {
          select: {
            id: true,
            user: { select: { fullName: true, email: true } },
          },
        },
        coach: {
          select: { user: { select: { fullName: true, email: true } } },
        },
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
        student: {
          select: {
            id: true,
            user: { select: { fullName: true, email: true } },
          },
        },
        coach: {
          select: { user: { select: { fullName: true, email: true } } },
        },
      },
    }),
    getManagementKocumSignals(),
  ]);

  const rows = assignments.map((a) => {
    const lastCompleted =
      a.sessions.filter((s) => s.status === "COMPLETED")[0]?.completedAt ??
      null;
    const next =
      a.sessions
        .filter((s) => s.status === "PLANNED")
        .sort((x, y) => x.scheduledAt.getTime() - y.scheduledAt.getTime())[0]
        ?.scheduledAt ?? null;
    const { overdue, overdueDays } = coachingOverdue(
      lastCompleted,
      next,
      a.cadenceDays,
    );
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
    (c) =>
      c.coachCapacity !== null && c._count.coachAssignments > c.coachCapacity,
  );
  const overdueRows = rows.filter((r) => r.overdue);

  /* Müdahale listesi: önce koçsuzlar, sonra gecikenler. */
  const interventions = [
    ...unassigned.map((s) => ({
      key: `u-${s.id}`,
      studentId: s.id,
      studentName: s.user.fullName || s.user.email,
      coachName: null as string | null,
      when: null as Date | null,
      issue: "Yön Koçluk üyesi · koç atanmadı",
      tone: "warn" as const,
    })),
    ...overdueRows.map((r) => ({
      key: `o-${r.id}`,
      studentId: r.studentId,
      studentName: r.studentName,
      coachName: r.coachName,
      when: r.next ?? r.lastCompleted,
      issue:
        r.overdueDays !== null
          ? `Görüşme ${r.overdueDays} gün gecikti`
          : "Görüşme gecikti",
      tone: "warn" as const,
    })),
  ];

  // Koç dizini: bugünkü ve geciken görüşme sayıları (aktif atamalardan).
  const todayKey = formatIstanbulDateInput(new Date());
  const coachStats = new Map<string, { today: number; overdue: number }>();
  for (const assignment of assignments) {
    const entry = coachStats.get(assignment.coach.id) ?? { today: 0, overdue: 0 };
    entry.today += assignment.sessions.filter(
      (item) => item.status === "PLANNED" && formatIstanbulDateInput(item.scheduledAt) === todayKey,
    ).length;
    coachStats.set(assignment.coach.id, entry);
  }
  for (const row of overdueRows) {
    const coachId = assignments.find((item) => item.id === row.id)?.coach.id;
    if (!coachId) continue;
    const entry = coachStats.get(coachId) ?? { today: 0, overdue: 0 };
    entry.overdue += 1;
    coachStats.set(coachId, entry);
  }

  const queueParams = await searchParams;
  const requested = typeof queueParams.kuyruk === "string" ? queueParams.kuyruk : "";
  const assigned = queueParams.atandi === "1";
  const counts: Record<CoachingQueue, number> = {
    "koc-bekleyen": unassigned.length,
    geciken: overdueRows.length,
    plansiz: adaptivePlanEnabled ? studentsWithoutPlan.length : 0,
    hedefsiz: studentsWithoutGoals.length,
    kapasite: overCapacity.length,
    sinyaller: kocumSignals.length,
  };
  const QUEUE_LABEL: Record<CoachingQueue, string> = {
    "koc-bekleyen": "Koç bekleyen",
    geciken: "Görüşme gecikti",
    plansiz: "Plan yayınlanmadı",
    hedefsiz: "Hedefi olmayan",
    kapasite: "Kapasite üstü koçlar",
    sinyaller: "Yön sinyalleri",
  };
  const visibleQueues = COACHING_QUEUES.filter((queue) => queue !== "plansiz" || adaptivePlanEnabled);
  const activeQueue: CoachingQueue = (visibleQueues as readonly string[]).includes(requested)
    ? (requested as CoachingQueue)
    : visibleQueues.find((queue) => counts[queue] > 0) ?? "koc-bekleyen";
  const queueHref = (queue: CoachingQueue, extra = "") => `/panel/yonetim/kocluk?kuyruk=${queue}${extra}`;

  // Yan panel: ?onizle=ata:<öğrenciId> → koç atama / devretme formu.
  const preview = typeof queueParams.onizle === "string" ? queueParams.onizle : "";
  const assignStudentId = preview.startsWith("ata:") ? preview.slice(4) : null;
  const assignTarget = assignStudentId
    ? interventions.find((row) => row.studentId === assignStudentId) ??
      [...studentsWithoutPlan, ...studentsWithoutGoals]
        .map((row) => ({
          key: `x-${row.id}`,
          studentId: row.student.id,
          studentName: row.student.user.fullName || row.student.user.email,
          coachName: row.coach.user.fullName || row.coach.user.email,
          when: null as Date | null,
          issue: "",
          tone: "warn" as const,
        }))
        .find((row) => row.studentId === assignStudentId) ??
      // Kuyrukta olmasa da aktif ataması olan öğrenci devredilebilir (öğrenci 360 bağlantıları).
      rows
        .filter((row) => row.studentId === assignStudentId)
        .map((row) => ({ studentId: row.studentId, studentName: row.studentName, coachName: row.coachName }))[0] ??
      null
    : null;

  const assignAction = (row: { studentId: string; studentName: string; coachName: string | null }) =>
    coaches.length ? (
      <Link
        href={queueHref(activeQueue, `&onizle=ata:${row.studentId}`)}
        scroll={false}
        className={buttonClass("secondary", "sm")}
        aria-haspopup="dialog"
      >
        {row.coachName ? "Devret" : "Koç ata"}
        <span className="sr-only"> · {row.studentName}</span>
      </Link>
    ) : (
      <span className="text-[12.5px] text-pn-text-muted">Koç yok</span>
    );

  const assignmentRows = (list: Array<{ id: string; student: { id: string; user: { fullName: string | null; email: string } }; coach: { user: { fullName: string | null; email: string } } }>) =>
    list.map((row) => ({
      studentId: row.student.id,
      studentName: row.student.user.fullName || row.student.user.email,
      coachName: row.coach.user.fullName || row.coach.user.email,
      key: row.id,
    }));

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} pageTitle="Koçluk operasyonu">
      <div className="max-w-[1100px]">
        <PageHeader
          title="Koçluk operasyonu"
          description={`${rows.length} koçluk öğrencisi · ${unassigned.length} öğrenci koç bekliyor · ${overCapacity.length} koç kapasite üstünde`}
        />

        {assignError ? (
          <p role="alert" className="mt-4 rounded-md border border-(--pn-tone-critical)/30 bg-(--pn-tone-critical-soft) px-4 py-3 text-[13.5px] font-medium text-(--pn-tone-critical)">
            {assignError}
          </p>
        ) : assigned ? (
          <p role="status" className="mt-4 rounded-md border border-pn-border bg-(--pn-tone-success-soft) px-4 py-3 text-[13.5px] font-medium text-(--pn-tone-success)">
            Koç ataması kaydedildi.
          </p>
        ) : null}

        {!adaptivePlanEnabled ? (
          <p className="mt-4 text-[13px] text-pn-text-muted">
            Uyarlanabilir plan şu anda kapalı: koç atama, görüşme takibi ve hedef operasyonu aktif; plan kuyruğu pilot açıldığında görünür.
          </p>
        ) : null}

        <Section id="kuyruklar" title="Kuyruklar" divider={false}>
          <ViewTabs
            label="Koçluk kuyrukları"
            activeId={activeQueue}
            tabs={visibleQueues.map((queue) => ({ id: queue, label: QUEUE_LABEL[queue], href: queueHref(queue), count: counts[queue] }))}
          />
          <div className="mt-3">
            {activeQueue === "koc-bekleyen" || activeQueue === "geciken" ? (
              (() => {
                const list = interventions.filter((row) => (activeQueue === "koc-bekleyen" ? !row.coachName : Boolean(row.coachName)));
                return list.length ? (
                  <PanelTable
                    caption="Koçluk müdahale listesi"
                    columns={["Öğrenci", "Koç", "Son / sonraki görüşme", "Sorun", "Aksiyon"]}
                  >
                    {list.map((row) => (
                      <PanelTableRow key={row.key}>
                        <PanelTableCell>
                          <Link href={`/panel/yonetim/ogrenciler/${row.studentId}?tab=kocluk`} className="font-medium text-pn-text underline-offset-2 hover:underline">
                            {row.studentName}
                          </Link>
                        </PanelTableCell>
                        <PanelTableCell>{row.coachName ?? <StatusBadge label="Atanmadı" tone="warning" />}</PanelTableCell>
                        <PanelTableCell>{row.when ? DATE.format(row.when) : "—"}</PanelTableCell>
                        <PanelTableCell>{row.issue}</PanelTableCell>
                        <PanelTableCell>{assignAction(row)}</PanelTableCell>
                      </PanelTableRow>
                    ))}
                  </PanelTable>
                ) : (
                  <EmptyState title={activeQueue === "koc-bekleyen" ? "Koç bekleyen öğrenci yok." : "Gecikmiş görüşme yok."} />
                );
              })()
            ) : activeQueue === "plansiz" || activeQueue === "hedefsiz" ? (
              (() => {
                const list = assignmentRows(activeQueue === "plansiz" ? studentsWithoutPlan : studentsWithoutGoals);
                return list.length ? (
                  <List label={QUEUE_LABEL[activeQueue]}>
                    {list.map((row) => (
                      <ListRow
                        key={row.key}
                        title={row.studentName}
                        href={`/panel/yonetim/ogrenciler/${row.studentId}?tab=kocluk`}
                        meta={`Koç: ${row.coachName}`}
                        action={assignAction(row)}
                      />
                    ))}
                  </List>
                ) : (
                  <EmptyState
                    title={
                      activeQueue === "plansiz"
                        ? "Aktif koçluk öğrencilerinin bu hafta için plan kaydı var."
                        : "Aktif koçluk öğrencilerinin hepsinde en az bir hedef tanımlı."
                    }
                  />
                );
              })()
            ) : activeQueue === "kapasite" ? (
              overCapacity.length ? (
                <List label="Kapasite üstü koçlar">
                  {overCapacity.map((coach) => (
                    <ListRow
                      key={coach.id}
                      title={coach.user.fullName || coach.user.email}
                      meta={`${coach._count.coachAssignments} / ${coach.coachCapacity} öğrenci`}
                      status={<StatusBadge label="Kapasite aşıldı" tone="critical" />}
                    />
                  ))}
                </List>
              ) : (
                <EmptyState title="Kapasitesini aşan koç yok." />
              )
            ) : kocumSignals.length ? (
              <List label="Yön operasyon sinyalleri">
                {kocumSignals.slice(0, 30).map((signal) => (
                  <ListRow
                    key={`${signal.code}-${signal.studentId}`}
                    title={signal.studentName}
                    href={`/panel/yonetim/ogrenciler/${signal.studentId}?tab=kocluk`}
                    description={signal.detail}
                  />
                ))}
              </List>
            ) : (
              <EmptyState title="Plansız, koçsuz, yayınlanmamış veya düşük uyumlu öğrenci sinyali yok." />
            )}
          </div>
        </Section>

        <Section id="koc-dizini" title="Koç dizini" description="Kapasite, bugünkü ve geciken görüşmeler.">
          {coaches.length === 0 ? (
            <EmptyState
              title="Koç olarak işaretli personel yok."
              body="Bir eğitmeni koç yapmak için kişi detayından koçluk bilgisini işaretleyin."
            />
          ) : (
            <PanelTable caption="Koç dizini" columns={["Koç", "Öğrenci / kapasite", "Bugünkü görüşme", "Geciken görüşme"]}>
              {coaches.map((coach) => {
                const load = coach._count.coachAssignments;
                const over = coach.coachCapacity !== null && load > coach.coachCapacity;
                const stats = coachStats.get(coach.id) ?? { today: 0, overdue: 0 };
                const pct = coach.coachCapacity ? Math.min(100, Math.round((load / coach.coachCapacity) * 100)) : null;
                return (
                  <PanelTableRow key={coach.id}>
                    <PanelTableCell>
                      <span className="font-medium text-pn-text">{coach.user.fullName || coach.user.email}</span>
                    </PanelTableCell>
                    <PanelTableCell>
                      <span className="flex items-center gap-2">
                        {pct !== null ? (
                          <span aria-hidden="true" className="block h-1 w-16 overflow-hidden rounded-full bg-pn-surface-subtle">
                            <span className={`block h-full rounded-full ${over ? "bg-(--pn-tone-critical)" : "bg-pn-accent-marker"}`} style={{ width: `${pct}%` }} />
                          </span>
                        ) : null}
                        <span className="tabular-nums">
                          {load}
                          {coach.coachCapacity !== null ? ` / ${coach.coachCapacity}` : ""}
                        </span>
                        {over ? <StatusBadge label="aşıldı" tone="critical" /> : null}
                      </span>
                    </PanelTableCell>
                    <PanelTableCell>{stats.today || "—"}</PanelTableCell>
                    <PanelTableCell>{stats.overdue ? <StatusBadge label={String(stats.overdue)} tone="warning" /> : "—"}</PanelTableCell>
                  </PanelTableRow>
                );
              })}
            </PanelTable>
          )}
        </Section>

        <Section id="son-gorusmeler" title="Son tamamlanan görüşmeler">
          {recentSessions.length === 0 ? (
            <p className="text-[14px] text-pn-text-muted">Henüz tamamlanmış koç görüşmesi kaydı yok.</p>
          ) : (
            <List label="Son tamamlanan görüşmeler">
              {recentSessions.map((row) => (
                <ListRow
                  key={row.id}
                  title={`${row.assignment.student.user.fullName || row.assignment.student.user.email} · ${row.assignment.coach.user.fullName || row.assignment.coach.user.email}`}
                  meta={`${row.completedAt ? DATE.format(row.completedAt) : "Tarih yok"}${row.focus ? ` · odak: ${row.focus}` : ""}`}
                />
              ))}
            </List>
          )}
        </Section>

        <p className="mt-8 text-[12.5px] text-pn-text-muted">
          Koçluk görüşmelerinin kendisi öğretmen panelinden kaydedilir.{" "}
          <Link href="/panel/yonetim/egitmenler" className="font-medium text-pn-text underline-offset-2 hover:underline">
            Öğretmenleri aç
          </Link>
        </p>
      </div>

      {assignTarget ? (
        <UrlDrawer
          title={assignTarget.coachName ? "Koçu devret" : "Koç ata"}
          description={assignTarget.coachName ? `${assignTarget.studentName} · şu an ${assignTarget.coachName}` : assignTarget.studentName}
        >
          <form action={assignCoach} className="space-y-4">
            <input type="hidden" name="studentId" value={assignTarget.studentId} />
            <input type="hidden" name="returnQueue" value={activeQueue} />
            <fieldset>
              <legend className="text-[13px] font-medium text-pn-text">Koç</legend>
              <div className="mt-2 border-t border-pn-border">
                {coaches.map((coach) => {
                  const load = coach._count.coachAssignments;
                  const full = coach.coachCapacity !== null && load >= coach.coachCapacity;
                  const pct = coach.coachCapacity ? Math.min(100, Math.round((load / coach.coachCapacity) * 100)) : null;
                  return (
                    <label key={coach.id} className="flex cursor-pointer items-center gap-3 border-b border-pn-border py-2.5">
                      <input type="radio" name="coachId" value={coach.id} required className="h-4 w-4 accent-(--pn-accent)" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-medium text-pn-text">{coach.user.fullName || coach.user.email}</span>
                        <span className="text-[12px] text-pn-text-muted">
                          {load}
                          {coach.coachCapacity !== null ? ` / ${coach.coachCapacity} öğrenci` : " öğrenci"}
                          {full ? " · kapasite dolu" : ""}
                        </span>
                      </span>
                      {pct !== null ? (
                        <span aria-hidden="true" className="block h-1 w-16 overflow-hidden rounded-full bg-pn-surface-subtle">
                          <span className={`block h-full rounded-full ${full ? "bg-(--pn-tone-warning)" : "bg-pn-accent-marker"}`} style={{ width: `${pct}%` }} />
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <label className="grid gap-1 text-[13px] font-medium text-pn-text">
              Görüşme sıklığı (gün)
              <input name="cadenceDays" type="number" min={1} className="panel-input w-32" />
            </label>
            <label className="grid gap-1 text-[13px] font-medium text-pn-text">
              Kapasite aşımı gerekçesi
              <input name="overrideReason" maxLength={500} className="panel-input" />
              <span className="text-[12px] font-normal text-pn-text-muted">Kapasitesi dolu bir koç seçerseniz zorunludur; denetim kaydına yazılır.</span>
            </label>
            <button type="submit" className={buttonClass("primary", "md")}>
              {assignTarget.coachName ? "Devret" : "Koç ata"}
            </button>
          </form>
        </UrlDrawer>
      ) : null}
    </PanelShell>
  );
}
