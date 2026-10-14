/**
 * Deneme çözücüsünün cevap senkronu — saf karar ve kalıcı bekleme kuyruğu
 * (P0-6 / P0-7, docs/roadmaps/odk-exam-experience-overhaul.md).
 *
 * İlke: öğrencinin son tıklaması ("yerel niyet") sunucu onaylayana kadar
 * BEKLEMEDE kalır ve tarayıcıda saklanır. Revizyon çakışmasında sunucu kaydı
 * temel alınıp niyet bir üst revizyonla yeniden gönderilir; niyet sunucudaki
 * değerle aynıysa kapanır. Cevaplar yalnız öğrencinin kendisine ait olduğundan
 * son niyetin kazanması doğru uzlaşmadır (iki sekmede de).
 */

export type AnswerOption = "A" | "B" | "C" | "D" | "E";
export type PendingAnswer = { questionId: string; selectedOption: AnswerOption | null; isMarked: boolean; revision: number };
export type ServerAnswer = { selectedOption: AnswerOption | null; isMarked: boolean; revision: number };

export type AnswerResponse =
  | { ok: true; answer: ServerAnswer }
  | { ok: false; code: string | null; answer?: ServerAnswer | null };

export type AnswerDecision =
  | { action: "SETTLED"; revision: number }
  | { action: "RESEND"; payload: PendingAnswer }
  | { action: "DROP" }
  | { action: "RETRY_LATER" };

/** Sunucunun kalıcı reddi: bu cevap artık yazılamaz (oturum/deneme kapandı). */
const TERMINAL_CODES = new Set(["ATTEMPT_CLOSED", "SESSION_LOCKED", "SESSION_BREAK", "QUESTION_NOT_IN_VERSION"]);

const sameIntent = (a: { selectedOption: AnswerOption | null; isMarked: boolean }, b: { selectedOption: AnswerOption | null; isMarked: boolean }) =>
  a.selectedOption === b.selectedOption && a.isMarked === b.isMarked;

export function reconcileAnswerResponse(intent: PendingAnswer, response: AnswerResponse): AnswerDecision {
  if (response.ok) return { action: "SETTLED", revision: response.answer.revision };
  if (response.code === "REVISION_CONFLICT") {
    const server = response.answer ?? null;
    if (server && sameIntent(server, intent)) return { action: "SETTLED", revision: server.revision };
    return { action: "RESEND", payload: { ...intent, revision: server ? server.revision + 1 : 1 } };
  }
  if (response.code && TERMINAL_CODES.has(response.code)) return { action: "DROP" };
  return { action: "RETRY_LATER" };
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const STORAGE_VERSION = 1;
const OPTIONS = new Set(["A", "B", "C", "D", "E"]);

export function pendingStorageKey(attemptId: string) {
  return `odk:pending-answers:${attemptId}`;
}

function isPendingAnswer(value: unknown): value is PendingAnswer {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.questionId === "string" && (row.selectedOption === null || (typeof row.selectedOption === "string" && OPTIONS.has(row.selectedOption))) && typeof row.isMarked === "boolean" && Number.isInteger(row.revision) && (row.revision as number) >= 1;
}

/** Saklanan bekleyen cevaplar; depolama yok/bozuk/erişilemezse boş. */
export function readPendingAnswers(storage: StorageLike | null | undefined, attemptId: string): Record<string, PendingAnswer> {
  try {
    const raw = storage?.getItem(pendingStorageKey(attemptId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { v?: number; answers?: Record<string, unknown> };
    if (parsed?.v !== STORAGE_VERSION || !parsed.answers || typeof parsed.answers !== "object") return {};
    return Object.fromEntries(Object.entries(parsed.answers).filter(([questionId, row]) => isPendingAnswer(row) && row.questionId === questionId)) as Record<string, PendingAnswer>;
  } catch {
    return {};
  }
}

/** Bekleyen cevapları yazar; boşsa kaydı siler. Depolama hatası (gizli pencere, kota) yutulur. */
export function writePendingAnswers(storage: StorageLike | null | undefined, attemptId: string, answers: Record<string, PendingAnswer>) {
  try {
    if (!storage) return;
    if (!Object.keys(answers).length) storage.removeItem(pendingStorageKey(attemptId));
    else storage.setItem(pendingStorageKey(attemptId), JSON.stringify({ v: STORAGE_VERSION, answers }));
  } catch {
    // Kalıcılık en iyi çaba: bellekteki kuyruk yine çalışır.
  }
}

/**
 * Yenileme sonrası: saklanan niyetlerden sunucudakiyle FARKLI olanları, sunucu
 * revizyonunun bir üstüne taşıyarak geri döner. Artık yazılamayan sorular
 * (kilitli oturum, sürümde olmayan soru) atılır.
 */
export function restorePendingAnswers(stored: Record<string, PendingAnswer>, server: Record<string, ServerAnswer>, writableQuestionIds: ReadonlySet<string>): Record<string, PendingAnswer> {
  const restored: Record<string, PendingAnswer> = {};
  for (const [questionId, intent] of Object.entries(stored)) {
    if (!writableQuestionIds.has(questionId)) continue;
    const current = server[questionId];
    if (current && sameIntent(current, intent)) continue;
    restored[questionId] = { ...intent, revision: current ? current.revision + 1 : 1 };
  }
  return restored;
}
