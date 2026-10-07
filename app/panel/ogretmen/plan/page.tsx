import { notFound } from "next/navigation";
import { ListChecks } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireTeacherStaffPermission } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { planningWeekStart } from "@/lib/adaptive-plan";
import { PanelShell } from "@/components/panel/panel-shell";
import { TeacherPlanReview } from "@/components/panel/teacher-plan-review";
import { SuggestionReviewButtons } from "@/components/panel/kocum/suggestion-review-buttons";
import { addIstanbulCalendarDays } from "@/lib/istanbul-time";
import { WEEKLY_PLAN_SUGGESTION_KIND_LABELS } from "@/lib/panel/status-vocabulary";
import Link from "next/link";
import {
  EmptyState,
  PageHeader,
  PanelTable,
  PanelTableCell,
  PanelTableRow,
  Section,
  StatusBadge,
  UrlDrawer,
  buttonClass,
} from "@/components/panel/ui";

export const dynamic = "force-dynamic";

/** Koç masasında tek seferde gösterilen plan sayısı. */
const TEACHER_PLAN_DESK_LIMIT = 25;

const CHANGE_CATEGORY: Record<string, string> = {
  TOO_MUCH: "Fazla yük",
  WRONG_DAYS: "Günler uymuyor",
  PRIORITY: "Öncelik",
  OTHER: "Diğer",
};

const PLAN_STATUS: Record<string, { label: string; tone: "neutral" | "warning" | "success" }> = {
  DRAFT: { label: "Taslak", tone: "neutral" },
  CHANGE_REQUESTED: { label: "Değişiklik istendi", tone: "warning" },
  APPROVED: { label: "Yayında", tone: "success" },
};

const UPDATED = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function TeacherPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ onizle?: string | string[] }>;
}) {
  // Yön koç masası: COACH@OK (ADMIN öğretmen modu dahil). OD grup öğretmenliği yetmez.
  const session = await requireTeacherStaffPermission("ok:coaching:write");
  if (!getPanelFeatureFlags().adaptivePlan) notFound();

  const weekStart = planningWeekStart();
  const weekEnd = addIstanbulCalendarDays(weekStart, 7);

  const plans = await prisma.weeklyPlan.findMany({
    where: {
      weekStart: { gte: weekStart, lt: weekEnd },
      status: { in: ["DRAFT", "CHANGE_REQUESTED", "APPROVED"] },
      // Koçluk çalışma alanı: yalnız insan onayı akışındaki ürünlerin planları.
      // Otomatik onaylı bir plan burada "onayla" düğmesiyle gösterilseydi,
      // düğme uçta 409 ile reddedilirdi.
      productRef: { requiresPlanApproval: true },
      // Koç masası Yön yazma yüzeyidir: yalnız AKTİF koçluk ataması olan
      // öğrencilerin planları. OD grup öğretmenliği koçluk yetkisi vermez.
      student: {
        coachAssignments: {
          some: { endedAt: null, coach: { userId: session.userId } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    // 50 öğrencili bir öğretmende bu sorgu sınırsızdı: 50 planın TÜM görevleri
    // ve `student` ilişkisinin tüm alanları tek istekte çekiliyordu (§33).
    // Masa en son dokunulan planları gösterir; alan seçimi de daraltıldı.
    take: TEACHER_PLAN_DESK_LIMIT,
    select: {
      id: true,
      status: true,
      version: true,
      weekStart: true,
      capacityMinutes: true,
      changeRequestCategory: true,
      updatedAt: true,
      studentId: true,
      student: {
        select: { id: true, user: { select: { fullName: true, email: true } } },
      },
      tasks: {
        where: { status: { not: "SKIPPED" } },
        orderBy: [{ scheduledFor: "asc" }, { position: "asc" }],
      },
    },
  });


  const suggestions = await prisma.weeklyPlanSuggestion.findMany({
    where: {
      status: "PENDING",
      studentId: { in: plans.map((p) => p.studentId) },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      rationale: true,
      kind: true,
      student: {
        select: { user: { select: { fullName: true, email: true } } },
      },
    },
  });

  const preview = (await searchParams).onizle;
  const openPlanId = typeof preview === "string" && preview.startsWith("plan:") ? preview.slice(5) : null;
  const openPlan = openPlanId ? plans.find((plan) => plan.id === openPlanId) ?? null : null;
  const pendingCount = plans.filter((plan) => plan.status !== "APPROVED").length;

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} pageTitle="Plan masası">
      <div className="max-w-[1100px]">
        <PageHeader
          eyebrow="Yön · Plan masası"
          icon={ListChecks}
          title="Plan masası"
          description={`${plans.length} plan · ${pendingCount} onay bekliyor · ${suggestions.length} öneri. Sistem önerir; kritik değişiklikler onayınız olmadan öğrenciye gitmez.`}
        />

        {suggestions.length ? (
          <Section id="oneriler" title="Bekleyen öneriler" divider={false} description="Tekrar kuyruğu, deneme sonrası ve adaptif öneriler — otomatik yayınlanmaz.">
            <ul className="border-t border-pn-border">
              {suggestions.map((item) => (
                <li key={item.id} className="border-b border-pn-border py-3">
                  <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium text-pn-text">
                    {item.student.user.fullName || item.student.user.email} · {item.title}
                    <StatusBadge label={WEEKLY_PLAN_SUGGESTION_KIND_LABELS[item.kind]} tone="info" />
                  </p>
                  <p className="mt-0.5 text-[13px] text-pn-text-secondary">{item.rationale}</p>
                  <SuggestionReviewButtons suggestionId={item.id} />
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        <Section id="planlar" title="Bu haftanın planları" divider={suggestions.length > 0}>
          {plans.length ? (
            <PanelTable caption="Bu haftanın planları" columns={["Öğrenci", "Durum", "Görev", "Kapasite", "Değişiklik nedeni", "Son güncelleme", ""]}>
              {plans.map((plan) => {
                const studentName = plan.student.user.fullName || plan.student.user.email;
                const minutes = plan.tasks.reduce((sum, task) => sum + task.durationMinutes, 0);
                const status = PLAN_STATUS[plan.status] ?? PLAN_STATUS.DRAFT;
                return (
                  <PanelTableRow key={plan.id}>
                    <PanelTableCell>
                      <Link href={`/panel/ogretmen/hazirlik/${plan.studentId}?sekme=plan`} className="font-medium text-pn-text underline-offset-2 hover:underline">
                        {studentName}
                      </Link>
                    </PanelTableCell>
                    <PanelTableCell>
                      <StatusBadge label={status.label} tone={status.tone} />
                    </PanelTableCell>
                    <PanelTableCell>{plan.tasks.length}</PanelTableCell>
                    <PanelTableCell>
                      <span className={`tabular-nums ${minutes > plan.capacityMinutes ? "text-(--pn-tone-warning)" : ""}`}>
                        {minutes} / {plan.capacityMinutes} dk
                      </span>
                    </PanelTableCell>
                    <PanelTableCell>{plan.changeRequestCategory ? CHANGE_CATEGORY[plan.changeRequestCategory] ?? plan.changeRequestCategory : "—"}</PanelTableCell>
                    <PanelTableCell>{UPDATED.format(plan.updatedAt)}</PanelTableCell>
                    <PanelTableCell>
                      <Link
                        href={`/panel/ogretmen/plan?onizle=plan:${plan.id}`}
                        scroll={false}
                        aria-haspopup="dialog"
                        className={buttonClass(plan.status === "APPROVED" ? "ghost" : "secondary", "sm")}
                      >
                        {plan.status === "APPROVED" ? "Aç" : "İncele"}
                        <span className="sr-only"> · {studentName} planı</span>
                      </Link>
                    </PanelTableCell>
                  </PanelTableRow>
                );
              })}
            </PanelTable>
          ) : (
            <EmptyState
              icon={ListChecks}
              title="Bu hafta için plan yok."
              body="Öğrenci plan oluşturduğunda veya öğrenci çalışma alanında şablon uyguladığınızda burada görünür."
            />
          )}
        </Section>
      </div>

      {openPlan ? (
        <UrlDrawer
          title={`${openPlan.student.user.fullName || openPlan.student.user.email} · haftalık plan`}
          description={`${openPlan.tasks.length} görev · kapasite ${openPlan.capacityMinutes} dk · v${openPlan.version}`}
        >
          <div className="space-y-4">
            <TeacherPlanReview
              plans={[
                {
                  id: openPlan.id,
                  studentName: openPlan.student.user.fullName || openPlan.student.user.email,
                  status: openPlan.status,
                  version: openPlan.version,
                  capacityMinutes: openPlan.capacityMinutes,
                  changeRequestCategory: openPlan.changeRequestCategory,
                  tasks: openPlan.tasks.map((task) => ({
                    id: task.id,
                    title: task.title,
                    scheduledFor: task.scheduledFor.toISOString(),
                    durationMinutes: task.durationMinutes,
                    reasonCode: task.reasonCode,
                  })),
                },
              ]}
            />
            <Link href={`/panel/ogretmen/hazirlik/${openPlan.studentId}?sekme=plan`} className={buttonClass("ghost", "sm")}>
              Takvimde düzenle, görev ekle veya şablon uygula
            </Link>
          </div>
        </UrlDrawer>
      ) : null}
    </PanelShell>
  );
}
