import { loadAdminCoaching } from "@/lib/panel/admin-coaching-server";
import { randomUUID } from "node:crypto";
import { coachAssignmentRevision } from "@/lib/panel/coach-assignment-core";
import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
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
  student: "Öğrenciyi bulamadık.",
  coach: "Seçilen koç aktif değil ya da koç olarak işaretli değil.",
  membership: "Öğrencinin aktif Yön Koçluk üyeliği yok; koç atanamaz.",
  conflict: "Koç ataması değişti. Güncel görünümü kontrol edip yeniden deneyin.",
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
  const { adaptivePlanEnabled, assignments, coaches, unassigned, recentSessions, studentsWithoutPlan, studentsWithoutGoals, kocumSignals, rows, overCapacity, overdueRows, interventions, coachStats } = await loadAdminCoaching();

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
                  <EmptyState title={activeQueue === "koc-bekleyen" ? "Koç bekleyen öğrenci yok ✅" : "Gecikmiş görüşme yok ✅"} />
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
                <EmptyState title="Kapasitesini aşan koç yok ✅" />
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
              <EmptyState title="Plansız, koçsuz, yayınlanmamış ya da düşük uyumlu öğrenci sinyali yok ✅" />
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
            <input type="hidden" name="idempotencyKey" value={randomUUID()} />
            <input type="hidden" name="expectedRevision" value={coachAssignmentRevision(assignments.find((a) => a.student.id === assignTarget.studentId) ?? null)} />
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
              <input name="cadenceDays" type="number" min={1} className="rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 w-32" />
            </label>
            <label className="grid gap-1 text-[13px] font-medium text-pn-text">
              Kapasite aşımı gerekçesi
              <input name="overrideReason" maxLength={500} className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60" />
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
