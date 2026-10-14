import "server-only";

import { prisma } from "@/lib/prisma";
import { loadAttemptSessionState } from "@/lib/odk/attempt-sessions-server";
import { resolveBookletFile } from "@/lib/odk/booklet-access";

/**
 * Öğrencinin şu an görebileceği kitapçık dosyası (Faz 5 / P1-1). Yalnız
 * kendi açık (IN_PROGRESS, süresi dolmamış) denemesinin sürümünden ve —
 * oturumlu sınavda — yalnız açık oturumun kitapçığı. Yetki (ürün rolü + paket
 * hakkı) çağıran uçta kontrol edilir.
 */
export async function loadStudentBookletFile(examId: string, studentUserId: string, now = new Date()) {
  const attempt = await prisma.odkExamAttempt.findFirst({
    where: { examId, studentUserId, status: "IN_PROGRESS", deadlineAt: { gt: now } },
    orderBy: { attemptNumber: "desc" },
    select: {
      id: true,
      startedAt: true,
      deadlineAt: true,
      version: { select: { settings: true, files: { where: { type: "BOOKLET_PDF" }, select: { id: true, sessionKey: true, blobPathname: true, fileName: true, mimeType: true } } } },
    },
  });
  if (!attempt) return { ok: false as const, code: "NO_ACTIVE_ATTEMPT", status: 404 as const };
  const state = await loadAttemptSessionState({ id: attempt.id, startedAt: attempt.startedAt, deadlineAt: attempt.deadlineAt, settings: attempt.version.settings }, now);
  const decision = resolveBookletFile(
    attempt.version.files,
    state ? { phase: state.timeline.phase, currentKey: state.timeline.current?.key ?? null } : null,
  );
  if (!decision.ok) return decision;
  const file = attempt.version.files.find((item) => item.id === decision.fileId)!;
  return { ok: true as const, scope: decision.scope, file };
}
