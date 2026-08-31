import Link from "next/link";
import { Activity, AlertTriangle, Clock3, CreditCard, MailWarning } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { OrderLinkForm } from "@/components/panel/order-link-form";
import { OdOnboardingControl } from "@/components/panel/od-onboarding-control";
import { AdminPageHeader } from "@/components/panel/admin-page-header";
import { LeadStatusControl } from "@/components/panel/lead-status-control";
import { EmailRetryButton } from "@/components/panel/email-retry-button";
import { evaluateCronHeartbeats } from "@/lib/jobs/health";
import { istanbulDayStart, istanbulNextDayStart } from "@/lib/istanbul-time";
import { OD_ONBOARDING_LABELS, OD_ONBOARDING_NEXT_ACTION } from "@/lib/od/onboarding-state";
import { calculateOdPlacementMetrics, OD_NO_SLOT_OPTIONS, OD_TIME_RANGE_OPTIONS } from "@/lib/od/placement";
import { deriveUnifiedOperationItems } from "@/lib/panel/operations-inbox";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  const session = await requireRole("ADMIN");
  const now = new Date();
  const dayStart = istanbulDayStart(now);
  const dayEnd = istanbulNextDayStart(now);
  const [orders, onboardingQueue, leads, studentsRaw, staffRaw, emailQueue, cronHeartbeats, placementTransitions, cancelledLessons] =
    await Promise.all([
      prisma.odOrder.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { user: { select: { fullName: true, email: true } } },
      }),
      prisma.odOnboarding.findMany({
        where: { order: { status: "PAID" }, state: { not: "ACTIVE" } },
        orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
        include: {
          owner: { select: { fullName: true, email: true } },
          transitions: {
            orderBy: { occurredAt: "desc" },
            take: 3,
            include: { actor: { select: { fullName: true, email: true } } },
          },
          order: {
            include: {
              user: {
                select: {
                  fullName: true,
                  email: true,
                  id: true,
                  studentProfile: {
                    select: {
                      id: true,
                      parents: { select: { id: true }, take: 1 },
                      enrollments: {
                        where: { endedAt: null },
                        select: {
                          group: {
                            select: {
                              name: true,
                              lessons: { where: { status: "PLANNED" }, select: { id: true }, take: 1 },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.leadSubmission.findMany({ orderBy: { submittedAt: "desc" }, take: 30 }),
      prisma.user.findMany({
        where: { role: "STUDENT", status: "ACTIVE" },
        orderBy: { fullName: "asc" },
        select: { id: true, fullName: true, email: true },
      }),
      prisma.user.findMany({
        where: { role: { in: ["ADMIN", "TEACHER"] }, status: "ACTIVE" },
        orderBy: { fullName: "asc" },
        select: { id: true, fullName: true, email: true, role: true },
      }),
      prisma.emailOutbox.findMany({
        where: { status: { not: "SENT" } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, subject: true, status: true, attempts: true, createdAt: true },
      }),
      prisma.cronHeartbeat.findMany(),
      prisma.odOnboardingTransition.findMany({
        where: { occurredAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
        select: { onboardingId: true, toState: true, occurredAt: true },
      }),
      prisma.lesson.findMany({
        where: { status: "CANCELLED", startsAt: { gte: dayStart, lt: dayEnd } },
        orderBy: { startsAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          startsAt: true,
          group: {
            select: {
              name: true,
              lessons: {
                where: { status: "PLANNED", startsAt: { gt: now } },
                select: { id: true },
                take: 1,
              },
              teacher: { select: { fullName: true, email: true } },
            },
          },
        },
      }),
    ]);

  const students = studentsRaw.map((student) => ({ id: student.id, name: student.fullName || student.email }));
  const staff = staffRaw.map((person) => ({ id: person.id, name: person.fullName || person.email }));
  const activeTeacherCount = staffRaw.filter((person) => person.role === "TEACHER").length;
  const readinessRows = [
    {
      task: "Filtrelenmiş kişilere davet tekrar gönderme",
      coverage: "Kişiler ekranı / Toplu operasyon",
      status: "GO" as const,
      note: "Panel içinde çalışır; SQL/Prisma müdahalesi gerekmez.",
    },
    {
      task: "Filtrelenmiş öğrencileri güvenli grup transferi",
      coverage: "Kişiler ekranı / Toplu operasyon",
      status: staffRaw.length > 0 ? ("GO" as const) : ("GAP" as const),
      note: staffRaw.length > 0 ? "Panel içinde çalışır; satır bazlı hata görünür." : "Aktif personel yok; panelde hedef atanamadığı için operasyon açılamaz.",
    },
    {
      task: "Öğretmen güvenli devir ve askıya alma",
      coverage: "Kişi detayı + Kişiler / Toplu operasyon",
      status: activeTeacherCount > 1 ? ("GO" as const) : ("GAP" as const),
      note:
        activeTeacherCount > 1
          ? "Panel içinde sorumluluk devriyle tamamlanır."
          : "Devralacak ikinci aktif öğretmen yok; önce öğretmen hesabı açılması gerekir.",
    },
    {
      task: "paid-order → active aktivasyon",
      coverage: "İşler / Activation Desk",
      status: "GO" as const,
      note: "Onboarding akışı panelde tamamlanır; dışarıdan SQL müdahalesi beklenmez.",
    },
  ];
  const readinessStatus = readinessRows.every((row) => row.status === "GO") ? "GO" : "GAP";
  const cronHealth = evaluateCronHeartbeats(cronHeartbeats);
  const placementMetrics = calculateOdPlacementMetrics(placementTransitions);
  const unifiedOperations = deriveUnifiedOperationItems({
    now,
    onboardings: onboardingQueue.map((item) => {
      const profile = item.order.user?.studentProfile;
      const hasParent = Boolean(profile?.parents.length);
      const hasGroup = Boolean(profile?.enrollments.length);
      const hasFirstLesson = Boolean(profile?.enrollments.some((enrollment) => enrollment.group.lessons.length));
      return {
        id: item.id,
        orderId: item.orderId,
        packageName: item.order.packageName,
        state: item.state,
        blockerReason: item.blockerReason,
        ownerName: item.owner?.fullName || item.owner?.email || null,
        dueAt: item.dueAt,
        stateEnteredAt: item.stateEnteredAt,
        studentLabel: item.order.user?.fullName || item.order.user?.email || "hesap bağlantısı bekleniyor",
        hasAccount: Boolean(profile),
        hasParent,
        hasGroup,
        hasFirstLesson,
        studentProfileId: profile?.id || null,
        nextAction: OD_ONBOARDING_NEXT_ACTION[item.state],
      };
    }),
    cancelledLessons: cancelledLessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      startsAt: lesson.startsAt,
      groupName: lesson.group.name,
      teacherName: lesson.group.teacher.fullName || lesson.group.teacher.email,
      hasFollowUpLesson: lesson.group.lessons.length > 0,
    })),
  });
  const openUnifiedOperations = unifiedOperations.filter((item) => item.resolution === "OPEN");
  const dateTime = new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Europe/Istanbul",
  });

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email}>
      <AdminPageHeader
        eyebrow="İşler / Activation Desk"
        title="Yeni öğrenciyi aktif et"
        description="Ödeme sonrası hesap, veli, grup ve ilk ders adımlarını tek operasyon masasında yönetin."
        icon={CreditCard}
        meta={`${openUnifiedOperations.length} açık operasyon istisnası`}
      />

      <section className="panel-surface mt-7">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--site-line)] p-5">
          <div>
            <h2 className="text-sm font-extrabold text-[var(--site-ink)]">Operational readiness gate</h2>
            <p className="mt-1 text-xs text-[var(--site-muted)]">
              Kritik günlük işler panel içinde tamamlanabiliyor mu, yoksa SQL/Prisma müdahalesi gerekiyor mu?
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${
              readinessStatus === "GO" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
            }`}
          >
            {readinessStatus}
          </span>
        </div>
        <div className="overflow-x-auto p-5">
          <table className="min-w-[760px] w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--site-line)] text-[11px] uppercase tracking-[.06em] text-[var(--site-muted)]">
                <th className="px-2 py-2">İş</th>
                <th className="px-2 py-2">Panel kapsamı</th>
                <th className="px-2 py-2">Durum</th>
                <th className="px-2 py-2">Not</th>
              </tr>
            </thead>
            <tbody>
              {readinessRows.map((row) => (
                <tr key={row.task} className="border-b border-[var(--site-line)] align-top">
                  <td className="px-2 py-2.5 font-semibold text-[var(--site-ink)]">{row.task}</td>
                  <td className="px-2 py-2.5 text-[var(--site-body)]">{row.coverage}</td>
                  <td className="px-2 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        row.status === "GO" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-[var(--site-muted)]">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel-surface mt-7">
        <div className="flex flex-col gap-3 border-b border-[var(--site-line)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-[var(--site-ink)]">Unified operations inbox</h2>
            <p className="mt-1 text-xs text-[var(--site-muted)]">
              Sahip, son tarih, sıradaki işlem ve çözülme durumuyla gerçek operasyon istisnalarını tek listede izleyin.
            </p>
          </div>
          <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-700">
            {openUnifiedOperations.length} açık · {unifiedOperations.length} toplam
          </span>
        </div>

        <div className="divide-y divide-[var(--site-line)]">
          {unifiedOperations.slice(0, 40).map((item) => {
            const overdue = Boolean(item.dueAt && item.dueAt < now && item.resolution === "OPEN");
            const severityTone =
              item.severity === "BLOCKING"
                ? "bg-rose-100 text-rose-800"
                : item.severity === "ACTION_REQUIRED"
                  ? "bg-amber-100 text-amber-900"
                  : "bg-slate-100 text-slate-700";
            return (
              <article key={item.id} className="p-5">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${severityTone}`}>
                        {item.severity}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                          item.resolution === "OPEN"
                            ? "bg-amber-50 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {item.resolution === "OPEN" ? "Açık" : "Çözüldü"}
                      </span>
                      {overdue ? (
                        <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-extrabold text-rose-800">
                          <AlertTriangle size={11} /> Son tarih geçti
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-2 text-sm font-extrabold text-[var(--site-ink)]">{item.title}</h3>
                    <p className="mt-1 text-xs text-[var(--site-muted)]">{item.detail}</p>
                  </div>
                  <dl className="grid min-w-[320px] grid-cols-2 gap-3 text-[10.5px]">
                    <div>
                      <dt className="text-[var(--site-muted)]">Sorumlu</dt>
                      <dd className="mt-1 font-bold text-[var(--site-ink)]">{item.owner}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--site-muted)]">Sıradaki işlem</dt>
                      <dd className="mt-1 font-bold text-[var(--site-ink)]">{item.nextAction}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--site-muted)]">Son tarih</dt>
                      <dd className={`mt-1 font-bold ${overdue ? "text-rose-700" : "text-[var(--site-ink)]"}`}>
                        {item.dueAt ? dateTime.format(item.dueAt) : "Tanımsız"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--site-muted)]">Olay zamanı</dt>
                      <dd className="mt-1 font-bold text-[var(--site-ink)]">{dateTime.format(item.createdAt)}</dd>
                    </div>
                  </dl>
                </div>
                <div className="mt-3">
                  <Link href={item.href} className="text-xs font-bold text-[var(--brand-olive)] underline-offset-2 hover:underline">
                    {item.ctaLabel}
                  </Link>
                </div>
              </article>
            );
          })}
          {!unifiedOperations.length ? (
            <p className="p-8 text-center text-sm text-[var(--site-muted)]">Açık operasyon istisnası yok.</p>
          ) : null}
        </div>
      </section>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PlacementMetric
          label="İlk iletişim"
          value={placementMetrics.firstContactHours === null ? "—" : `${placementMetrics.firstContactHours} sa`}
          detail={`${placementMetrics.firstContactSample} ölçüm · hedef ≤24 sa`}
        />
        <PlacementMetric
          label="Yerleştirme süresi"
          value={placementMetrics.placementHours === null ? "—" : `${placementMetrics.placementHours} sa`}
          detail={`${placementMetrics.placementSample} ölçüm · hedef ≤48 sa`}
        />
        <PlacementMetric
          label="Uygun slot bulunamadı"
          value={placementMetrics.noSlotRate === null ? "—" : `%${placementMetrics.noSlotRate}`}
          detail={`${placementMetrics.onboardingCount} onboarding · son 90 gün`}
        />
        <PlacementMetric
          label="Sonuçlar"
          value={`${placementMetrics.outcomes.assigned} grup`}
          detail={`${placementMetrics.outcomes.alternate} alternatif · ${placementMetrics.outcomes.waitlist} bekleme · ${placementMetrics.outcomes.refund} iade`}
        />
      </section>

      <section className="panel-surface mt-7">
        <div className="flex flex-col gap-3 border-b border-[var(--site-line)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-[var(--site-ink)]">Yeni öğrenciyi aktif et</h2>
            <p className="mt-1 text-xs text-[var(--site-muted)]">
              Ödenmiş siparişi hesap, veli, grup ve ilk ders adımlarından geçirip aktif öğrenciye dönüştürün.
            </p>
          </div>
          <span className="w-fit rounded-full bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-900">
            {onboardingQueue.length} açık vaka
          </span>
        </div>

        <div className="divide-y divide-[var(--site-line)]">
          {onboardingQueue.map((item) => {
            const profile = item.order.user?.studentProfile;
            const hasParent = Boolean(profile?.parents.length);
            const hasGroup = Boolean(profile?.enrollments.length);
            const hasLesson = Boolean(
              profile?.enrollments.some((enrollment) => enrollment.group.lessons.length),
            );
            const overdue = Boolean(item.dueAt && item.dueAt < now);
            const checklist = [
              { key: "account", label: "Hesap", done: Boolean(profile) },
              { key: "parent", label: "Veli", done: hasParent },
              { key: "group", label: "Grup", done: hasGroup },
              { key: "lesson", label: "İlk ders", done: hasLesson },
            ];
            const missingCount = checklist.filter((entry) => !entry.done).length;
            const preferences = (
              (item.order.buyerInfo ?? {}) as {
                placementPreferences?: {
                  timeRanges?: string[];
                  earliestStartDate?: string | null;
                  noSlotPreference?: string;
                };
              }
            ).placementPreferences;

            return (
              <article key={item.id} className="p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                          item.state === "BLOCKED" || item.state === "MANUAL_REVIEW" || item.state === "REFUND_PENDING"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {OD_ONBOARDING_LABELS[item.state]}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700">
                        {item.flowType === "EXISTING_STUDENT" ? "Mevcut öğrenci" : "Yeni öğrenci"}
                      </span>
                      {overdue ? (
                        <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-extrabold text-rose-800">
                          <AlertTriangle size={11} /> Son tarih geçti
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-2 text-sm font-extrabold text-[var(--site-ink)]">{item.order.packageName}</h3>
                    <p className="mt-1 text-xs text-[var(--site-muted)]">
                      {item.order.user?.fullName || item.order.user?.email || "Henüz hesaba bağlanmadı"} ·{" "}
                      {(item.order.totalCents / 100).toLocaleString("tr-TR")} ₺
                    </p>
                  </div>

                  <dl className="grid min-w-[320px] grid-cols-2 gap-3 text-[10.5px]">
                    <div>
                      <dt className="text-[var(--site-muted)]">Sıradaki işlem</dt>
                      <dd className="mt-1 font-bold text-[var(--site-ink)]">{OD_ONBOARDING_NEXT_ACTION[item.state]}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--site-muted)]">Sorumlu</dt>
                      <dd className="mt-1 font-bold text-[var(--site-ink)]">
                        {item.owner?.fullName || item.owner?.email || "Atanmamış"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--site-muted)]">Son tarih</dt>
                      <dd
                        className={`mt-1 flex items-center gap-1 font-bold ${
                          overdue ? "text-rose-700" : "text-[var(--site-ink)]"
                        }`}
                      >
                        <Clock3 size={12} />
                        {item.dueAt ? dateTime.format(item.dueAt) : "Tanımsız"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--site-muted)]">Son geçiş</dt>
                      <dd className="mt-1 font-bold text-[var(--site-ink)]">{dateTime.format(item.stateEnteredAt)}</dd>
                    </div>
                  </dl>
                </div>

                {preferences ? (
                  <div className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-[10.5px] leading-5 text-sky-950">
                    <strong>Müsaitlik:</strong>{" "}
                    {(preferences.timeRanges || [])
                      .map((value) => OD_TIME_RANGE_OPTIONS.find((option) => option.value === value)?.label || value)
                      .join(" · ") || "Belirtilmedi"}{" "}
                    · <strong>En erken:</strong> {preferences.earliestStartDate || "hemen"} ·{" "}
                    <strong>Slot yoksa:</strong>{" "}
                    {OD_NO_SLOT_OPTIONS.find((option) => option.value === preferences.noSlotPreference)?.label ||
                      preferences.noSlotPreference ||
                      "iletişim"}
                  </div>
                ) : null}

                <div className="mt-3 rounded-xl border border-[var(--site-line)] bg-white px-3 py-2.5">
                  <p className="text-[10.5px] font-bold text-[var(--site-ink)]">Aktivasyon checklist’i</p>
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {checklist.map((entry) => (
                      <p key={entry.key} className="flex items-center gap-2 text-[10.5px]">
                        <span
                          className={`inline-flex h-2 w-2 rounded-full ${
                            entry.done ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        <span className={entry.done ? "text-emerald-800" : "text-rose-800"}>
                          {entry.label} {entry.done ? "hazır" : "eksik"}
                        </span>
                      </p>
                    ))}
                  </div>
                  {missingCount === 0 ? (
                    <p className="mt-2 text-[10.5px] font-bold text-emerald-700">Checklist tamam, geçişe hazır.</p>
                  ) : (
                    <p className="mt-2 text-[10.5px] font-bold text-rose-700">{missingCount} adım eksik.</p>
                  )}
                </div>

                {item.blockerReason ? (
                  <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800">
                    <strong>Bloker:</strong> {item.blockerReason}
                  </p>
                ) : null}

                {!item.order.userId ? <OrderLinkForm orderId={item.orderId} students={students} /> : null}

                <OdOnboardingControl
                  orderId={item.orderId}
                  state={item.state}
                  blockedFromState={item.blockedFromState}
                  ownerId={item.ownerId}
                  staff={staff}
                />

                <details className="mt-3">
                  <summary className="cursor-pointer text-[10.5px] font-bold text-[var(--brand-olive)]">
                    Son geçişler ({item.transitions.length})
                  </summary>
                  <div className="mt-2 space-y-1">
                    {item.transitions.map((transition) => (
                      <p key={transition.id} className="text-[10.5px] text-[var(--site-muted)]">
                        {dateTime.format(transition.occurredAt)} ·{" "}
                        {transition.fromState ? `${OD_ONBOARDING_LABELS[transition.fromState]} → ` : ""}
                        {OD_ONBOARDING_LABELS[transition.toState]} ·{" "}
                        {transition.actor?.fullName || transition.actor?.email || "Sistem"}
                        {transition.note ? ` · ${transition.note}` : ""}
                      </p>
                    ))}
                  </div>
                </details>
              </article>
            );
          })}

          {!onboardingQueue.length ? (
            <p className="p-8 text-center text-sm text-[var(--site-muted)]">Aktivasyon bekleyen ödenmiş sipariş yok.</p>
          ) : null}
        </div>
      </section>

      <section id="cron-durumu" className="panel-surface mt-7 scroll-mt-24">
        <div className="flex flex-col gap-3 border-b border-[var(--site-line)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-[var(--site-ink)]">
              <Activity size={17} /> Kritik cron heartbeat&apos;leri
            </h2>
            <p className="mt-1 text-xs text-[var(--site-muted)]">
              Kalıcı son çalışma kanıtı · ODK yaşam döngüsü için sıkı 8 dakika eşiği
            </p>
          </div>
          <span
            className={`w-fit rounded-full px-2.5 py-1 text-xs font-extrabold ${
              cronHealth.ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
            }`}
          >
            {cronHealth.ok ? "Tümü sağlıklı" : `${cronHealth.jobs.filter((job) => job.status !== "healthy").length} alarm`}
          </span>
        </div>

        <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
          {cronHealth.jobs.map((job) => (
            <article
              key={job.name}
              className={`rounded-2xl border p-4 ${
                job.name === "odk-exam-lifecycle" ? "border-[var(--brand-olive)]" : "border-[var(--site-line)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold text-[var(--site-ink)]">{job.label}</p>
                  <p className="mt-1 font-mono text-[10px] text-[var(--site-muted)]">{job.name}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[9px] font-extrabold uppercase ${
                    job.status === "healthy" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {job.status === "healthy"
                    ? "Sağlıklı"
                    : job.status === "stale"
                      ? "Gecikmiş"
                      : job.status === "failed"
                        ? "Başarısız"
                        : "Kanıt yok"}
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-[10.5px]">
                <div>
                  <dt className="text-[var(--site-muted)]">Son başarı</dt>
                  <dd className="mt-1 font-bold text-[var(--site-ink)]">
                    {job.lastSucceededAt ? dateTime.format(new Date(job.lastSucceededAt)) : "Henüz yok"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--site-muted)]">Süre</dt>
                  <dd className="mt-1 font-bold text-[var(--site-ink)]">
                    {job.lastDurationMs === null ? "—" : `${job.lastDurationMs} ms`}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--site-muted)]">İşlenen</dt>
                  <dd className="mt-1 font-bold text-[var(--site-ink)]">{job.processedCount}</dd>
                </div>
                <div>
                  <dt className="text-[var(--site-muted)]">Başarısız</dt>
                  <dd className="mt-1 font-bold text-[var(--site-ink)]">{job.failedCount}</dd>
                </div>
              </dl>

              {job.errorCode ? (
                <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 font-mono text-[10px] text-rose-800">{job.errorCode}</p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <div className="mt-7 grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="text-sm font-bold text-[var(--site-ink)]">
            Siparişler <span className="text-[var(--site-muted)]">({orders.length})</span>
          </h2>
          <div className="mt-3 space-y-2">
            {orders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-[var(--site-line)] bg-white p-4 shadow-[var(--panel-card-shadow)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Link
                      href={`/panel/yonetim/siparisler/${order.id}`}
                      className="text-sm font-bold text-[var(--site-ink)] underline-offset-2 hover:underline"
                    >
                      {order.packageName}
                    </Link>
                    <p className="mt-1 text-xs text-[var(--site-muted)]">
                      {order.user?.fullName || order.user?.email || "Henüz hesaba bağlanmadı"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      order.status === "PAID" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {order.status} · {(order.totalCents / 100).toLocaleString("tr-TR")} ₺
                  </span>
                </div>
                <OrderLinkForm orderId={order.id} students={students} currentUserId={order.userId} />
              </div>
            ))}
            {!orders.length ? (
              <p className="rounded-2xl border border-dashed border-[var(--site-line)] p-5 text-sm text-[var(--site-muted)]">
                Henüz sipariş yok.
              </p>
            ) : null}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold text-[var(--site-ink)]">
            Talepler <span className="text-[var(--site-muted)]">({leads.length})</span>
          </h2>
          <div className="mt-3 space-y-2">
            {leads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--site-line)] bg-white p-4 shadow-[var(--panel-card-shadow)]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--site-ink)]">{lead.fullName}</p>
                  <p className="mt-1 truncate text-xs text-[var(--site-muted)]">
                    {lead.phone} · {lead.examType} · {lead.targetGoal}
                  </p>
                </div>
                <LeadStatusControl id={lead.id} status={lead.intakeStatus} />
              </div>
            ))}
            {!leads.length ? (
              <p className="rounded-2xl border border-dashed border-[var(--site-line)] p-5 text-sm text-[var(--site-muted)]">
                Henüz talep yok.
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <section id="eposta-kuyrugu" className="panel-surface mt-7 scroll-mt-24">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--site-line)] p-5">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-[var(--site-ink)]">
              <MailWarning size={17} /> E-posta kuyruğu
            </h2>
            <p className="mt-1 text-xs text-[var(--site-muted)]">Bekleyen veya başarısız makbuz ve bildirimler</p>
          </div>
          <span className="rounded-full bg-[var(--site-bg-warm)] px-2.5 py-1 text-xs font-bold text-[var(--site-muted)]">
            {emailQueue.length}
          </span>
        </div>

        <div className="divide-y divide-[var(--site-line)]">
          {emailQueue.map((email) => (
            <article key={email.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-sm font-bold text-[var(--site-ink)]">{email.subject}</h3>
                  <span
                    className={`rounded-full px-2 py-1 text-[9px] font-extrabold ${
                      email.status === "PENDING"
                        ? "bg-amber-50 text-amber-800"
                        : email.status === "FAILED"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {email.status === "PENDING" ? "Bekliyor" : email.status === "FAILED" ? "Başarısız" : "Bırakıldı"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--site-muted)]">
                  {new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(email.createdAt)} ·{" "}
                  {email.attempts} deneme
                </p>
              </div>
              {email.status !== "PENDING" ? <EmailRetryButton id={email.id} /> : <span className="text-xs font-bold text-amber-700">Otomatik gönderilecek</span>}
            </article>
          ))}
          {!emailQueue.length ? <p className="p-8 text-center text-sm text-[var(--site-muted)]">Bekleyen e-posta yok.</p> : null}
        </div>
      </section>
    </PanelShell>
  );
}

function PlacementMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="panel-metric-card">
      <p className="text-[10px] font-extrabold uppercase tracking-[.07em] text-[var(--site-muted)]">{label}</p>
      <p className="mt-3 text-2xl font-black text-[var(--site-ink)]">{value}</p>
      <p className="mt-1 text-[10.5px] text-[var(--site-muted)]">{detail}</p>
    </article>
  );
}
