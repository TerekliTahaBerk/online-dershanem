import { createHash } from "node:crypto";

/**
 * Taslak soru listesinin İÇERİK revizyonu (Faz 4 / P1-6). Soru yazmak sürüm
 * kaydının `updatedAt` alanını değiştirmediği için eşzamanlı düzenleme ancak
 * içerik hash'iyle yakalanır: editör listeyi açtığı andaki revizyonu gönderir,
 * sunucu aynı transaction'da güncel revizyonla karşılaştırır.
 */
export type QuestionRevisionState = {
  id: string;
  correctOption: string | null;
  difficulty: string;
  bookletPage: number | null;
  contentType: string;
  contentText: string | null;
  assetUrl: string | null;
  outcomes: ReadonlyArray<{ outcomeId: string; isPrimary: boolean }>;
};

export function questionsRevision(questions: ReadonlyArray<QuestionRevisionState>): string {
  const rows = [...questions]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((question) => [
      question.id,
      question.correctOption,
      question.difficulty,
      question.bookletPage,
      question.contentType,
      question.contentText,
      question.assetUrl,
      [...question.outcomes].map((outcome) => `${outcome.outcomeId}${outcome.isPrimary ? "*" : ""}`).sort(),
    ]);
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}
