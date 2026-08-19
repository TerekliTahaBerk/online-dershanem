import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { DINO_PROMPT_VERSION, dinoAudienceSchema, findDinoQuestion } from "@/lib/dino";
import { prepareDinoSource } from "@/lib/panel/dino-source";
import { generateDinoAnswer } from "@/lib/dino-gateway";
import { resolveParentScope } from "@/lib/panel/parent-scope";
import { logAudit } from "@/lib/audit";

/**
 * DINO AI — yanıt üretimi.
 *
 * Kapı sırası `app/api/panel/ai-drafts/route.ts` ile AYNIDIR ve hiçbiri
 * atlanmaz: rol → özellik bayrağı → mutation guard (aynı köken + hız limiti) →
 * tekrar-güvenliği (`requestKey`) → KAPSAM DOĞRULAMA → günlük kota →
 * redaksiyon/injection → sağlayıcı → denetim kaydı.
 *
 * KAPSAM DOĞRULAMA burada güvenliğin kalbidir: hangi öğrencinin verisi
 * toplanacağı istekten DEĞİL, çağıranın yetkisinden türetilir. Veli
 * `resolveParentScope` ile (bağlı olmayan öğrenci 404), eğitmen aktif grup
 * kaydıyla, öğrenci ise yalnız kendisiyle sınırlıdır.
 */

const schema = z
  .object({
    audience: dinoAudienceSchema,
    questionKey: z.string().min(1).max(60),
    /** Veli ve eğitmen için hangi öğrenci; öğrenci kendisi sorduğunda yok sayılır. */
    studentId: z.string().min(1).max(80).optional(),
    requestKey: z.string().uuid(),
  })
  .strict();

const redactionBand = (count: number) => (count === 0 ? "0" : count <= 2 ? "1-2" : "3+");
const latencyBand = (ms: number) => (ms <= 2_000 ? "0-2S" : ms <= 8_000 ? "2-8S" : "8S+");

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

export async function POST(request: Request) {
  const auth = await requireApiRole("STUDENT", "PARENT", "TEACHER");
  if (!auth.ok) return auth.response;

  if (!getPanelFeatureFlags().dinoAi) {
    return NextResponse.json({ error: "Dino AI henüz açık değil." }, { status: 404 });
  }

  const guard = await guardMutation({
    action: "panel.dino.ask",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:dino:${auth.session.userId}`,
    rateLimit: { max: 20, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Soru seçimini kontrol edin." }, { status: 400 });

  /* Rol ile hedef kitle uyuşmalı: öğrenci veli sorusu soramaz. */
  if (parsed.data.audience !== auth.session.role) {
    return NextResponse.json({ error: "Bu soru bu rol için tanımlı değil." }, { status: 403 });
  }

  const question = findDinoQuestion(parsed.data.questionKey, parsed.data.audience);
  if (!question) return NextResponse.json({ error: "Tanımsız soru." }, { status: 400 });

  const replay = await prisma.dinoAnswer.findFirst({
    where: { requestKey: parsed.data.requestKey, userId: auth.session.userId },
  });
  if (replay) return NextResponse.json({ answer: replay, replayed: true });

  /* ── KAPSAM: hangi öğrencinin verisi? ── */
  let studentProfileId: string | null = null;
  let knownNames: string[] = [];
  let teacherUserId: string | undefined;

  if (auth.session.role === "STUDENT") {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: auth.session.userId },
      select: { id: true, user: { select: { fullName: true } } },
    });
    studentProfileId = profile?.id ?? null;
    knownNames = profile?.user.fullName ? [profile.user.fullName] : [];
  } else if (auth.session.role === "PARENT") {
    const { selected } = await resolveParentScope(auth.session.userId, parsed.data.studentId);
    studentProfileId = selected?.id ?? null;
    knownNames = selected ? [selected.name] : [];
  } else {
    // Eğitmen: yalnız aktif grubundaki öğrenci.
    if (!parsed.data.studentId) {
      return NextResponse.json({ error: "Öğrenci seçilmedi." }, { status: 400 });
    }
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: parsed.data.studentId,
        endedAt: null,
        group: { teacherId: auth.session.userId, isActive: true },
      },
      select: { student: { select: { id: true, user: { select: { fullName: true } } } } },
    });
    if (!enrollment) {
      return NextResponse.json({ error: "Yetkili olduğunuz öğrenci bulunamadı." }, { status: 404 });
    }
    studentProfileId = enrollment.student.id;
    knownNames = enrollment.student.user.fullName ? [enrollment.student.user.fullName] : [];
    teacherUserId = auth.session.userId;
  }

  if (!studentProfileId) {
    return NextResponse.json({ error: "Öğrenci kaydı bulunamadı." }, { status: 404 });
  }

  const prepared = await prepareDinoSource({
    question,
    audience: parsed.data.audience,
    studentProfileId,
    teacherUserId,
    knownNames,
  });

  /* ── Günlük kota ── */
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const [dailyCount, dailyCost] = await Promise.all([
    prisma.dinoAnswer.count({ where: { userId: auth.session.userId, createdAt: { gte: since } } }),
    prisma.dinoAnswer.aggregate({
      where: { userId: auth.session.userId, createdAt: { gte: since } },
      _sum: { estimatedCostMicrousd: true },
    }),
  ]);
  const maxDaily = boundedInteger(process.env.DINO_MAX_DAILY_REQUESTS, 15, 1, 100);
  const maxCost = boundedInteger(process.env.DINO_MAX_DAILY_MICRO_USD, 100_000, 1_000, 10_000_000);

  const forcedReason = prepared.injectionDetected
    ? "PROMPT_INJECTION"
    : prepared.safe.sources.length === 0
      ? "NO_SOURCE_DATA"
      : dailyCount >= maxDaily || (dailyCost._sum.estimatedCostMicrousd || 0) >= maxCost
        ? "DAILY_QUOTA"
        : undefined;

  const generated = await generateDinoAnswer(prepared.safe, { forceFallbackReason: forcedReason });

  try {
    const answer = await prisma.dinoAnswer.create({
      data: {
        userId: auth.session.userId,
        audience: parsed.data.audience,
        questionKey: question.key,
        subjectStudentId: studentProfileId,
        provider: generated.provider,
        modelName: generated.modelName,
        promptVersion: DINO_PROMPT_VERSION,
        sourceHash: prepared.sourceHash,
        sourceRefs: prepared.safe.sources.map((row) => ({
          id: row.id,
          label: row.label,
        })) as Prisma.InputJsonValue,
        answer: generated.content as unknown as Prisma.InputJsonValue,
        fallbackReason: generated.fallbackReason,
        redactionCount: prepared.redactionCount,
        latencyMs: generated.latencyMs,
        inputTokens: generated.inputTokens,
        outputTokens: generated.outputTokens,
        estimatedCostMicrousd: generated.estimatedCostMicrousd,
        requestKey: parsed.data.requestKey,
      },
    });

    await logAudit({
      actorUserId: auth.session.userId,
      entityType: "DinoAnswer",
      entityId: answer.id,
      action: "dino.answer.generated",
      summary: `Dino yanıtı üretildi (${question.key})`,
      payload: {
        audience: parsed.data.audience,
        questionKey: question.key,
        provider: generated.provider,
        promptVersion: DINO_PROMPT_VERSION,
        sourceCount: prepared.safe.sources.length,
        redactionBand: redactionBand(prepared.redactionCount),
        latencyBand: latencyBand(generated.latencyMs),
        fallbackReason: generated.fallbackReason,
      },
    });

    return NextResponse.json({ answer, replayed: false });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicate = await prisma.dinoAnswer.findFirst({
        where: { requestKey: parsed.data.requestKey, userId: auth.session.userId },
      });
      if (duplicate) return NextResponse.json({ answer: duplicate, replayed: true });
    }
    throw error;
  }
}
