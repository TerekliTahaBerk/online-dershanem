import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordPlanRevision, appendTimelineEvent } from "@/lib/kocum/server";
import { buildRevisionChangeSummary, selectTasksForPlanCopy } from "@/lib/kocum";
import { istanbulDayStart, istanbulWeekStart, addIstanbulCalendarDays } from "@/lib/istanbul-time";
import { getOkPlanProductId } from "@/lib/kocum/plan-product";

export const coachTaskSchema = z.object({
  studentId: z.string().min(1),
  weekStart: z.string().datetime().optional(),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional().nullable(),
  subject: z.string().trim().max(80).optional().nullable(),
  topic: z.string().trim().max(120).optional().nullable(),
  taskKind: z
    .enum([
      "TOPIC_STUDY",
      "QUESTION_PRACTICE",
      "REVIEW",
      "VIDEO",
      "MATERIAL_READ",
      "CLASSIC_ASSIGNMENT",
      "MOCK_EXAM",
      "ERROR_ANALYSIS",
      "PERSONAL_GOAL",
      "CUSTOM",
    ])
    .default("CUSTOM"),
  scheduleMode: z.enum(["SCHEDULED", "FLEXIBLE"]).default("FLEXIBLE"),
  scheduledFor: z.string().datetime(),
  durationMinutes: z.number().int().min(5).max(480),
  targetType: z.enum(["QUESTIONS", "MINUTES", "PAGES", "VIDEOS", "NONE"]).default("NONE"),
  targetValue: z.number().min(0).max(5000).optional().nullable(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  sourceType: z
    .enum(["MANUAL_COACH", "ASSIGNMENT", "REVIEW", "MOCK_EXAM", "SYSTEM_SUGGESTED", "PERSONAL_GOAL"])
    .default("MANUAL_COACH"),
  sourceReferenceId: z.string().min(1).optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
});

export async function createCoachTask(input: z.infer<typeof coachTaskSchema>, actorId: string, actorName: string, db: PrismaClient = prisma) {
  if (input.sourceType === "ASSIGNMENT") {
    if (!input.sourceReferenceId) {
      return NextResponse.json({ error: "Ödev referansı gerekli." }, { status: 400 });
    }
    // Duplicate task for same assignment in same week is blocked.
    const weekStart = istanbulWeekStart(new Date(input.scheduledFor));
    const dup = await db.weeklyPlanTask.findFirst({
      where: {
        sourceType: "ASSIGNMENT",
        sourceReferenceId: input.sourceReferenceId,
        plan: { studentId: input.studentId, weekStart },
      },
      select: { id: true },
    });
    if (dup) {
      return NextResponse.json({ error: "Bu ödev zaten plana bağlı." }, { status: 409 });
    }
  }

  const scheduledFor = istanbulDayStart(new Date(input.scheduledFor));
  const weekStart = istanbulWeekStart(input.weekStart ? new Date(input.weekStart) : scheduledFor);

  const okProductId = await getOkPlanProductId(db);
  const result = await db.$transaction(async (tx) => {
    let plan = await tx.weeklyPlan.findUnique({
      where: { studentId_weekStart: { studentId: input.studentId, weekStart } },
    });
    if (!plan) {
      plan = await tx.weeklyPlan.create({
        data: {
          studentId: input.studentId,
          // Koç eliyle görev eklemek tanımı gereği bir Online Koçum planı açar.
          productRefId: okProductId,
          weekStart,
          status: "DRAFT",
          capacityMinutes: 0,
          createdById: actorId,
          ruleVersion: "kocum-manual-v1",
        },
      });
    }

    if (plan.productRefId !== okProductId) return null;

    const last = await tx.weeklyPlanTask.findFirst({
      where: { planId: plan.id, scheduledFor },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const task = await tx.weeklyPlanTask.create({
      data: {
        planId: plan.id,
        scheduledFor,
        position: (last?.position || 0) + 1,
        title: input.title,
        description: input.description ?? null,
        subject: input.subject ?? null,
        topic: input.topic ?? null,
        taskKind: input.taskKind,
        scheduleMode: input.scheduleMode,
        durationMinutes: input.durationMinutes,
        targetType: input.targetType,
        targetValue: input.targetValue ?? null,
        priority: input.priority,
        sourceType: input.sourceType,
        sourceReferenceId: input.sourceReferenceId ?? null,
        reasonCode: "CAPACITY_BALANCE",
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        status: "PLANNED",
      },
    });

    const nextVersion = plan.version + 1;
    await tx.weeklyPlan.update({
      where: { id: plan.id },
      data: {
        version: nextVersion,
        capacityMinutes: plan.capacityMinutes + input.durationMinutes,
      },
    });

    // Revizyon AYNI işlemde yazılır (§28): sürüm artıp revizyon yazılmadan
    // kalırsa plan geçmişinde delik oluşuyordu.
    await recordPlanRevision({
      planId: plan.id,
      version: nextVersion,
      changedById: actorId,
      changeSummary: buildRevisionChangeSummary({
        previousVersion: plan.version,
        nextVersion,
        actorLabel: actorName || "Koç",
      }),
      tx,
    });

    return { task, planId: plan.id, version: nextVersion, previousVersion: plan.version, status: plan.status, studentId: plan.studentId };
  }).catch((error: unknown) => {
    // Yukarıdaki `findFirst` kontrolü ile bu yazma arasında ikinci bir istek
    // araya girebilir. Koşullu benzersiz indeks (migration 0100) yazmayı
    // reddeder; kullanıcıya 500 değil anlaşılır bir çakışma dönülür.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return null;
    }
    throw error;
  });

  if (!result) {
    return NextResponse.json({ error: "Plan bu işlem için uygun değil veya görev zaten bağlı." }, { status: 409 });
  }

  if (result.status === "APPROVED") {
    await appendTimelineEvent({
      studentId: result.studentId,
      kind: "PLAN_REVISED",
      title: "Plana yeni görev eklendi",
      summary: result.task.title,
      visibility: "STUDENT",
      tx: db,
    });
  }

  return NextResponse.json({ ok: true, taskId: result.task.id, planId: result.planId, version: result.version });
}

export const coachCopySchema = z.object({
  targetWeekStart: z.string().datetime().optional(),
  carryOverIncomplete: z.boolean().default(true),
});

export async function copyCoachPlan(input: z.infer<typeof coachCopySchema>, actorId: string, actorName: string, db: PrismaClient = prisma, id: string = "") {
  const source = await db.weeklyPlan.findUnique({
    where: { id },
    include: { productRef: { select: { code: true } }, tasks: { orderBy: [{ scheduledFor: "asc" }, { position: "asc" }] } },
  });
  if (!source || source.productRef.code !== "OK") return NextResponse.json({ error: "Plan bulunamadı." }, { status: 404 });


  const targetWeekStart = istanbulWeekStart(
    input.targetWeekStart
      ? new Date(input.targetWeekStart)
      : addIstanbulCalendarDays(source.weekStart, 7),
  );

  const existing = await db.weeklyPlan.findUnique({
    where: {
      studentId_weekStart: { studentId: source.studentId, weekStart: targetWeekStart },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Hedef haftada plan zaten var." }, { status: 409 });
  }

  const dayDelta = targetWeekStart.getTime() - source.weekStart.getTime();
  /*
   * ESKİ FİLTRE YANLIŞ İŞİ TAŞIYORDU. `carryOverIncomplete` açıkken
   * TAMAMLANMIŞ (`DONE`) görevler kopyalanıyor, buna karşılık `COULD_NOT` ve
   * `PARTIAL` — yani öğrencinin gerçekten bitiremediği iş — dışarıda
   * kalıyordu. Devretmenin amacı tam tersidir (§9, §10).
   */
  const tasksToCopy = selectTasksForPlanCopy(source.tasks, {
    carryOverIncomplete: input.carryOverIncomplete,
  });
  if (!tasksToCopy.length) {
    return NextResponse.json(
      { error: "Taşınacak görev yok." },
      { status: 400 },
    );
  }

  const plan = await db.$transaction(async (tx) => {
    const created = await tx.weeklyPlan.create({
      data: {
        studentId: source.studentId,
        // Kopya, kaynak planın ürününde kalır — kopyalarken ürün değiştirmek
        // sessizce başka bir onay politikasına geçmek olurdu.
        productRefId: source.productRefId,
        weekStart: targetWeekStart,
        status: "DRAFT",
        capacityMinutes: tasksToCopy.reduce((sum, t) => sum + t.durationMinutes, 0) || source.capacityMinutes,
        createdById: actorId,
        ruleVersion: "kocum-copy-v1",
      },
    });

    if (tasksToCopy.length) {
      await tx.weeklyPlanTask.createMany({
        data: tasksToCopy.map((task, index) => ({
          planId: created.id,
          scheduledFor: new Date(task.scheduledFor.getTime() + dayDelta),
          position: task.position || index + 1,
          title: task.title,
          description: task.description,
          subject: task.subject,
          topic: task.topic,
          taskKind: task.taskKind,
          scheduleMode: task.scheduleMode,
          durationMinutes: task.durationMinutes,
          targetType: task.targetType,
          targetValue: task.targetValue,
          dueAt: task.dueAt ? new Date(task.dueAt.getTime() + dayDelta) : null,
          priority: task.priority,
          // Kaynak ve gerekçe OLDUĞU GİBİ korunur (§10). Eskiden REVIEW,
          // RECOVERY, MOCK_EXAM gibi kaynaklar `MANUAL_COACH`'a düzleniyordu:
          // görev taşındıktan sonra neden var olduğu kayboluyor, "Tekrar
          // kuyruğu" görevi "Koç görevi" gibi görünüyordu.
          sourceType: task.sourceType,
          sourceReferenceId: task.sourceReferenceId,
          reasonCode: task.reasonCode,
          status: "PLANNED",
        })),
      });
    }

    return created;
  }).catch((error: unknown) => {
    // Aynı anda iki kopyalama isteği (çift tıklama, iki koç) hedef haftada
    // tek plan bırakır: benzersizlik ihlali 500 değil 409 döner.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return null;
    }
    throw error;
  });

  if (!plan) {
    return NextResponse.json({ error: "Hedef haftada plan zaten var." }, { status: 409 });
  }

  await recordPlanRevision({
    planId: plan.id,
    tx: db,
    version: plan.version,
    changedById: actorId,
    changeSummary: buildRevisionChangeSummary({
      previousVersion: 0,
      nextVersion: 1,
      actorLabel: "Plan kopyası",
    }),
  });

  return NextResponse.json({ ok: true, planId: plan.id, weekStart: targetWeekStart.toISOString() });
}

export const coachSummarySchema = z.object({
  studentId: z.string().min(1),
  weekStart: z.string().datetime().optional(),
  planCompletionPct: z.number().int().min(0).max(100).optional().nullable(),
  strengths: z.string().trim().max(500).optional().nullable(),
  focusAreas: z.string().trim().max(500).optional().nullable(),
  nextWeekFocus: z.string().trim().max(500).optional().nullable(),
  studentVisibleText: z.string().trim().max(1000).optional().nullable(),
  parentVisibleText: z.string().trim().max(1000).optional().nullable(),
  publish: z.boolean().default(false),
});

export async function saveCoachSummary(input: z.infer<typeof coachSummarySchema>, actorId: string, actorName: string, db: PrismaClient = prisma) {
  const weekStart = istanbulWeekStart(
    input.weekStart ? new Date(input.weekStart) : new Date(),
  );

  const existing = await db.weeklyCoachSummary.findUnique({
    where: { studentId_weekStart: { studentId: input.studentId, weekStart } },
    select: { id: true, status: true },
  });
  const alreadyPublished = existing?.status === "PUBLISHED";

  /*
   * Atlanan alan KORUNUR, açıkça `null` gönderilen alan temizlenir.
   * Eskiden her alan `?? null` ile yazılıyordu: yalnız `nextWeekFocus`
   * güncelleyen kısmi bir istek, veliye giden `parentVisibleText`'i
   * sessizce siliyordu.
   */
  const keep = <T,>(value: T | undefined): T | null | undefined =>
    value === undefined ? undefined : value ?? null;

  const summary = await db.weeklyCoachSummary.upsert({
    where: {
      studentId_weekStart: { studentId: input.studentId, weekStart },
    },
    create: {
      studentId: input.studentId,
      weekStart,
      planCompletionPct: input.planCompletionPct ?? null,
      strengths: input.strengths ?? null,
      focusAreas: input.focusAreas ?? null,
      nextWeekFocus: input.nextWeekFocus ?? null,
      studentVisibleText: input.studentVisibleText ?? null,
      parentVisibleText: input.parentVisibleText ?? null,
      status: input.publish ? "PUBLISHED" : "DRAFT",
      publishedAt: input.publish ? new Date() : null,
      publishedById: input.publish ? actorId : null,
    },
    update: {
      planCompletionPct: keep(input.planCompletionPct),
      strengths: keep(input.strengths),
      focusAreas: keep(input.focusAreas),
      nextWeekFocus: keep(input.nextWeekFocus),
      studentVisibleText: keep(input.studentVisibleText),
      parentVisibleText: keep(input.parentVisibleText),
      // Yayın damgası bir kez atılır; yeniden yayın `publishedAt`'i
      // ileri kaydırıp özeti "yeni" göstermez.
      ...(input.publish && !alreadyPublished
        ? {
            status: "PUBLISHED" as const,
            publishedAt: new Date(),
            publishedById: actorId,
          }
        : {}),
    },
  });

  // Zaman çizelgesi olayı YALNIZ ilk yayında (§19). Aynı özet iki kez
  // yayınlandığında veli aynı bildirimi iki kez görüyordu.
  if (input.publish && !alreadyPublished) {
    await appendTimelineEvent({
      studentId: input.studentId,
      kind: "COACH_SUMMARY",
      title: "Haftalık koç özeti yayınlandı",
      summary: summary.parentVisibleText || undefined,
      visibility: "PARENT",
      tx: db,
    });
  }

  return NextResponse.json({ ok: true, summaryId: summary.id, status: summary.status });
}
