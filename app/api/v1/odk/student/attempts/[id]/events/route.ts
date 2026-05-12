import type { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSessionApi, apiOk, apiErr } from "@/lib/odk/api";

export const dynamic = "force-dynamic";

const EVENT_TYPES = [
  "TAB_BLUR", "TAB_FOCUS",
  "VISIBILITY_HIDDEN", "VISIBILITY_VISIBLE",
  "FULLSCREEN_ENTER", "FULLSCREEN_EXIT",
  "RIGHT_CLICK", "COPY", "PASTE", "CUT", "PRINT", "KEY_DEVTOOLS",
  "ANSWER_CHANGE", "NAVIGATE", "AUTOSAVE",
  "NETWORK_DROP", "NETWORK_RESUME", "WARNING_SHOWN",
] as const;

// Hangi event tipleri "ihlal" sayılır → cheatViolationCount'u artırır
const VIOLATION_TYPES = new Set<(typeof EVENT_TYPES)[number]>([
  "TAB_BLUR", "VISIBILITY_HIDDEN",
  "FULLSCREEN_EXIT",
  "COPY", "PASTE", "CUT", "PRINT",
  "KEY_DEVTOOLS",
]);

const EventSchema = z.object({
  type: z.enum(EVENT_TYPES),
  questionNumber: z.number().int().positive().optional(),
  payload: z.record(z.string(), z.any()).optional(),
  occurredAt: z.string().datetime().optional(),
});

const BodySchema = z.object({
  events: z.array(EventSchema).min(1).max(50),
});

/**
 * POST /api/v1/odk/student/attempts/[id]/events
 * Hile/UX olaylarını batch halinde kaydeder. cheatViolationCount tetiklenir.
 * sendBeacon ile de çağrılabilir (Content-Type olmadan da kabul eder).
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: attemptId } = await ctx.params;
  const auth = await requireSessionApi();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    // sendBeacon Blob olarak gelebilir
    try {
      const text = await req.text();
      body = JSON.parse(text);
    } catch {
      return apiErr("Geçersiz JSON.", 400);
    }
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return apiErr("Geçersiz istek.", 422, parsed.error.flatten());

  const attempt = await prisma.odkExamAttempt.findUnique({
    where: { id: attemptId },
    select: { id: true, userId: true, status: true },
  });
  if (!attempt) return apiErr("Çözüm bulunamadı.", 404);
  if (attempt.userId !== auth.userId) return apiErr("Bu çözüme erişiminiz yok.", 403);
  // SUBMITTED sonrası bile log gelebilir (sayfa kapanışında); engellemiyoruz
  // ama IN_PROGRESS değilse counter güncellemiyoruz.

  const violationDelta = parsed.data.events.reduce(
    (n, e) => n + (VIOLATION_TYPES.has(e.type) ? 1 : 0),
    0,
  );

  await prisma.$transaction(async (tx) => {
    await tx.odkExamAttemptEvent.createMany({
      data: parsed.data.events.map((e) => ({
        attemptId,
        type: e.type,
        questionNumber: e.questionNumber ?? null,
        payload: e.payload === undefined ? Prisma.JsonNull : (e.payload as Prisma.InputJsonValue),
        occurredAt: e.occurredAt ? new Date(e.occurredAt) : new Date(),
      })),
    });

    if (attempt.status === "IN_PROGRESS") {
      await tx.odkExamAttempt.update({
        where: { id: attemptId },
        data: {
          lastEventAt: new Date(),
          ...(violationDelta > 0
            ? { cheatViolationCount: { increment: violationDelta } }
            : {}),
        },
      });
    }
  });

  // Güncel sayım için tekrar oku (UI'a banner için lazım)
  const after = await prisma.odkExamAttempt.findUnique({
    where: { id: attemptId },
    select: { cheatViolationCount: true },
  });

  return apiOk({
    accepted: parsed.data.events.length,
    violationDelta,
    totalViolations: after?.cheatViolationCount ?? 0,
  });
}
