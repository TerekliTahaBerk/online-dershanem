import { NextResponse } from "next/server";
import { activePlanSourceKeys, planSourceKey } from "@/lib/kocum";
import { prisma } from "@/lib/prisma";
import { requireApiProductCodeRole, requireApiProductRole, type ApiAuth } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import {
  ADAPTIVE_PLAN_RULE_VERSION,
  buildAdaptiveWeek,
  examCountdownCapacity,
  plannedTaskRows,
  planningWeekStart,
  type ExamCountdownCapacity,
} from "@/lib/adaptive-plan";
import { collectPlanCandidates } from "@/lib/adaptive-plan-server";
import { collectKpssPlanCandidates } from "@/lib/kpss/adaptive-plan-server";
import { canRegeneratePlan, initialPlanApprovalState } from "@/lib/kocum/plan-approval";
import { KPSS_PRODUCT_CODE, OK_PRODUCT_CODE, getPlanProductByCode } from "@/lib/kocum/plan-product";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { addIstanbulCalendarDays } from "@/lib/istanbul-time";

/**
 * HAFTALIK PLAN ÜRETİMİ — ürün-bazlı dallanma.
 *
 * Ürün kapısı önce Online Koçum için denenir: BUGÜN çalışan her istek aynı
 * guard'dan, aynı sırayla, aynı sonuçla geçer. Yalnız OK kapısından geçemeyen
 * bir istek KPSS kapısına uğrar; o da geçmezse OK'nın ÜRETTİĞİ hata aynen
 * döner — yani OK kullanıcısının gördüğü hiçbir yanıt değişmez.
 *
 * Aday kaynağı ve kapasite ürüne göre dallanır; çekirdek çözücü
 * (`buildAdaptiveWeek`, `adaptive-v1`) iki üründe de ortaktır.
 */
export async function POST(request: Request) {
  // Ürün kapıları bilerek DÜZ METİN: `product-entitlement-matrix.test.ts` her
  // route'un ürün kapsamını kaynak metninden doğruluyor.
  const okAuth = await requireApiProductRole("OK", "STUDENT");
  let auth: ApiAuth = okAuth;
  let fallbackProductCode: string = OK_PRODUCT_CODE;
  if (!okAuth.ok) {
    const kpssAuth = await requireApiProductCodeRole("KPSS", "STUDENT");
    // KPSS erişimi de yoksa: bugünkü davranış — OK guard'ının yanıtı.
    if (!kpssAuth.ok) return okAuth.response;
    auth = kpssAuth;
    fallbackProductCode = KPSS_PRODUCT_CODE;
  }
  if (!auth.ok) return auth.response;

  if (!getPanelFeatureFlags().adaptivePlan) return NextResponse.json({ error: "Haftalık plan henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.adaptive_plan.generate", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:plan-generate:${auth.session.userId}`, rateLimit: { max: 12, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const profile = await prisma.studentProfile.findUnique({ where: { userId: auth.session.userId }, include: { planPreference: true } });
  if (!profile) return NextResponse.json({ error: "Öğrenci profili bulunamadı." }, { status: 404 });
  const preference = profile.planPreference;
  if (!preference) return NextResponse.json({ error: "Önce uygun gün ve çalışma sürenizi seçin." }, { status: 400 });
  if (!preference.planningEnabled) return NextResponse.json({ error: "Haftalık plan tercihiniz kapalı." }, { status: 400 });
  const now = new Date();
  const weekStart = planningWeekStart(now);
  const weekEnd = addIstanbulCalendarDays(weekStart, 7);
  // Eski kayıtlar UTC 00:00'da olabilir; aynı İstanbul haftasında tek plan sayılır.
  const existing = await prisma.weeklyPlan.findFirst({
    where: { studentId: profile.id, weekStart: { gte: weekStart, lt: weekEnd } },
    orderBy: { weekStart: "asc" },
    include: { tasks: true, productRef: { select: { id: true, code: true, requiresPlanApproval: true } } },
  });

  /*
   * Mevcut planın ÜRÜNÜ otoritedir. Yeniden üretim bir planı sessizce başka bir
   * ürüne — dolayısıyla başka bir onay politikasına — taşımamalı.
   */
  const product = existing ? existing.productRef : await getPlanProductByCode(fallbackProductCode);

  /*
   * Onaylı plan kilitlidir: koç onayladıysa öğrenci önce değişiklik ister
   * (mevcut OK davranışı). Otomatik onaylı planda kilitleyen bir insan kararı
   * yoktur — aksi halde KPSS öğrencisi ilk plandan sonra haftasını bir daha
   * dengeleyemezdi.
   */
  if (existing && !canRegeneratePlan(existing)) {
    return NextResponse.json({ error: "Onaylı plan kilitli. Önce değişiklik isteyin." }, { status: 409 });
  }

  // Ayakta kalan HER görevin kaynağı dışlanır — yalnız tamamlananların değil.
  // Bkz. `activePlanSourceKeys`: yarım kalan iş ikinci kez eklenmemeli.
  const activeSources = existing ? activePlanSourceKeys(existing.tasks) : new Set<string>();
  const isKpssPlan = product.code === KPSS_PRODUCT_CODE;
  const candidates = (
    isKpssPlan
      ? await collectKpssPlanCandidates(profile.id, preference, now)
      : await collectPlanCandidates(profile.id, preference)
  ).filter((item) => !activeSources.has(planSourceKey({ ...item, title: item.title })));

  const availableDays = Array.isArray(preference.availableDays) ? preference.availableDays.filter((day): day is number => typeof day === "number") : [];
  const baseMaxTasksPerDay = Math.min(3, preference.maxTasksPerDay);
  /*
   * Sınav geri sayımı YALNIZ KPSS planlarında devrede. OK planı bu fonksiyona
   * hiç uğramaz: kapasitesi tercih ekranındaki değerlerin aynısıdır.
   */
  const capacity: ExamCountdownCapacity = isKpssPlan
    ? examCountdownCapacity({ now, examAt: preference.nextExamAt, minutesPerDay: preference.minutesPerDay, maxTasksPerDay: baseMaxTasksPerDay })
    : { tier: "NONE", weeksRemaining: null, minutesPerDay: preference.minutesPerDay, maxTasksPerDay: baseMaxTasksPerDay };

  const tasks = buildAdaptiveWeek({ now, availableDays, minutesPerDay: capacity.minutesPerDay, maxTasksPerDay: capacity.maxTasksPerDay, candidates });
  const capacityMinutes = availableDays.length * capacity.minutesPerDay;

  /*
   * Onay durumu ürün politikasından gelir: OK planı TASLAK doğar ve koç onayı
   * bekler; onay gerektirmeyen üründe plan üretildiği anda `autoApproved`
   * işaretiyle onaylı doğar ve onay ucuna hiç uğramaz.
   */
  const approval = initialPlanApprovalState(product, now);

  const plan = await prisma.$transaction(async (tx) => {
    const row = existing
      ? await tx.weeklyPlan.update({
          where: { id: existing.id },
          data: {
            status: approval.status,
            ruleVersion: ADAPTIVE_PLAN_RULE_VERSION,
            capacityMinutes,
            createdById: auth.session.userId,
            approvedById: approval.approvedById,
            approvedAt: approval.approvedAt,
            autoApproved: approval.autoApproved,
            changeRequestCategory: null,
            version: { increment: 1 },
            generatedAt: now,
          },
        })
      : await tx.weeklyPlan.create({
          data: {
            studentId: profile.id,
            productRefId: product.id,
            weekStart,
            ruleVersion: ADAPTIVE_PLAN_RULE_VERSION,
            capacityMinutes,
            createdById: auth.session.userId,
            status: approval.status,
            approvedById: approval.approvedById,
            approvedAt: approval.approvedAt,
            autoApproved: approval.autoApproved,
          },
        });
    if (existing) await tx.weeklyPlanTask.updateMany({ where: { planId: row.id, status: "PLANNED" }, data: { status: "SKIPPED" } });
    if (tasks.length) await tx.weeklyPlanTask.createMany({ data: plannedTaskRows(row.id, tasks) });
    return row;
  });
  await recordPanelProductEvent({ name: "plan_generated", properties: { ruleVersion: ADAPTIVE_PLAN_RULE_VERSION, taskCount: tasks.length, capacityMinutes: plan.capacityMinutes, reasonCount: new Set(tasks.map((task) => task.reasonCode)).size, rebalanced: Boolean(existing) } }, auth.session.role);
  return NextResponse.json({
    id: plan.id,
    taskCount: tasks.length,
    rebalanced: Boolean(existing),
    status: plan.status,
    autoApproved: plan.autoApproved,
    requiresApproval: product.requiresPlanApproval,
    examCountdown: capacity.tier === "NONE" ? null : { tier: capacity.tier, weeksRemaining: capacity.weeksRemaining },
  });
}
