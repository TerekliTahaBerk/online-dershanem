/**
 * ODK puanlama: bölüm bazlı net = doğru − yanlış / ceza katsayısı (YKS 4, LGS 3).
 *
 * Negatif bölüm netinin sıfırda kesilmesi bir PUANLAMA POLİTİKASI kararıdır
 * (`OdkScoringPolicy.minimumNetIsZero`); burada sessizce uygulanmaz, çağıran
 * politikadan geçirir. Ham (kesilmemiş) net her durumda ayrıca raporlanır;
 * böylece politika değişse de tarihsel sonuç yeniden yorumlanabilir.
 */

export type SubtestScore = {
  code: string;
  title: string;
  /** Alt testte puanlamaya giren (iptal edilmemiş) soru sayısı. */
  questionCount: number;
  correct: number;
  wrong: number;
  blank: number;
  /** Alt test neti bilgi amaçlıdır ve kesilmez (ham); resmî kesme test (bölüm) düzeyindedir. */
  net: number;
};

export type SectionScore = {
  sectionId: string;
  /** Bölüm kodu (ör. MAT); alan bazlı görünüm bununla filtreler. */
  code?: string;
  title: string;
  questionCount: number;
  correct: number;
  wrong: number;
  blank: number;
  /** Raporlanan net: politika `minimumNetIsZero` ise max(0, rawNet). */
  net: number;
  /** Kesilmemiş ham net: correct − wrong / penalty. */
  rawNet: number;
  subtests?: SubtestScore[];
};

export type ScoringResult = {
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  /** Raporlanan bölüm netlerinin toplamı. */
  totalNet: number;
  /** Ham bölüm netlerinin toplamı (politikadan bağımsız). */
  rawTotalNet: number;
  minimumNetIsZero: boolean;
  sectionScores: SectionScore[];
  perQuestion: Array<{
    sectionId: string;
    questionNumber: number;
    selected: string | null;
    correct: string;
    isCorrect: boolean;
    isBlank: boolean;
  }>;
};

export type OutcomeScoreSummary = {
  outcomeId: string;
  questionCount: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  accuracyRate: number;
  /** Kazanıma bağlı soruların toplam aktif süresi; süre verisi verilmediyse alan yoktur. */
  activeDurationMs?: number;
};

export function aggregateOutcomeScores(evaluations: Array<{ result: "CORRECT" | "WRONG" | "BLANK"; outcomeIds: string[]; activeDurationMs?: number }>): OutcomeScoreSummary[] {
  const buckets = new Map<string, Omit<OutcomeScoreSummary, "outcomeId" | "accuracyRate">>();
  for (const evaluation of evaluations) {
    for (const outcomeId of new Set(evaluation.outcomeIds)) {
      const bucket = buckets.get(outcomeId) || { questionCount: 0, correctCount: 0, wrongCount: 0, blankCount: 0 };
      bucket.questionCount += 1;
      if (evaluation.activeDurationMs !== undefined) bucket.activeDurationMs = (bucket.activeDurationMs ?? 0) + Math.max(0, evaluation.activeDurationMs);
      if (evaluation.result === "CORRECT") bucket.correctCount += 1;
      else if (evaluation.result === "WRONG") bucket.wrongCount += 1;
      else bucket.blankCount += 1;
      buckets.set(outcomeId, bucket);
    }
  }
  return [...buckets.entries()].map(([outcomeId, bucket]) => ({ outcomeId, ...bucket, accuracyRate: Math.round((bucket.correctCount / bucket.questionCount) * 10_000) / 100 }));
}

type SectionInput = {
  id: string;
  code?: string;
  title: string;
  questionCount: number;
};

type OfficialAnswerInput = {
  sectionId: string;
  questionNumber: number;
  correctOption: string;
};

type OpticalAnswerInput = {
  sectionId: string;
  questionNumber: number;
  selectedOption: string;
};

const DEFAULT_PENALTY = 4; // 4 yanlış 1 doğru götürür
const round2 = (value: number) => Math.round(value * 100) / 100 + 0; // +0: -0 → 0

export type ScoringPolicyOptions = {
  /** Negatif bölüm netini sıfırda kes. Varsayılan true (mevcut tüm politikalar). */
  minimumNetIsZero?: boolean;
};

export function scoreAttempt(
  sections: SectionInput[],
  officialAnswers: OfficialAnswerInput[],
  studentAnswers: OpticalAnswerInput[],
  penalty: number = DEFAULT_PENALTY,
  options: ScoringPolicyOptions = {},
): ScoringResult {
  const minimumNetIsZero = options.minimumNetIsZero !== false;
  const studentMap = new Map<string, string>();
  for (const a of studentAnswers) {
    studentMap.set(`${a.sectionId}:${a.questionNumber}`, a.selectedOption);
  }

  const perSection = new Map<string, SectionScore>();
  for (const s of sections) {
    perSection.set(s.id, {
      sectionId: s.id,
      ...(s.code ? { code: s.code } : {}),
      title: s.title,
      questionCount: s.questionCount,
      correct: 0,
      wrong: 0,
      blank: 0,
      net: 0,
      rawNet: 0,
    });
  }

  const perQuestion: ScoringResult["perQuestion"] = [];
  let correctTotal = 0;
  let wrongTotal = 0;
  let blankTotal = 0;

  for (const oa of officialAnswers) {
    const key = `${oa.sectionId}:${oa.questionNumber}`;
    const selected = studentMap.get(key) ?? null;
    const isBlank = !selected;
    const isCorrect = !isBlank && selected === oa.correctOption;
    perQuestion.push({
      sectionId: oa.sectionId,
      questionNumber: oa.questionNumber,
      selected,
      correct: oa.correctOption,
      isCorrect,
      isBlank,
    });
    const bucket = perSection.get(oa.sectionId);
    if (!bucket) continue;
    if (isBlank) {
      bucket.blank += 1;
      blankTotal += 1;
    } else if (isCorrect) {
      bucket.correct += 1;
      correctTotal += 1;
    } else {
      bucket.wrong += 1;
      wrongTotal += 1;
    }
  }

  let totalNet = 0;
  let rawTotalNet = 0;
  const sectionScores: SectionScore[] = [];
  for (const s of sections) {
    const b = perSection.get(s.id);
    if (!b) continue;
    b.rawNet = round2(b.correct - b.wrong / penalty);
    b.net = minimumNetIsZero ? Math.max(0, b.rawNet) : b.rawNet;
    totalNet += b.net;
    rawTotalNet += b.rawNet;
    sectionScores.push(b);
  }

  return {
    correctCount: correctTotal,
    wrongCount: wrongTotal,
    blankCount: blankTotal,
    totalNet: round2(totalNet),
    rawTotalNet: round2(rawTotalNet),
    minimumNetIsZero,
    sectionScores,
    perQuestion,
  };
}

/**
 * Bölüm içi alt test kırılımı (Faz 3): soru numarası alt testin aralığındaysa o
 * alt teste sayılır. Anahtarda olmayan (iptal) soru `perQuestion`'da olmadığı
 * için doğal olarak dışarıda kalır.
 */
export function scoreSubtests(
  perQuestion: ScoringResult["perQuestion"],
  subtestsBySection: ReadonlyMap<string, ReadonlyArray<{ code: string; title: string; questionStart: number; questionEnd: number }>>,
  penalty: number = DEFAULT_PENALTY,
): Map<string, SubtestScore[]> {
  const result = new Map<string, SubtestScore[]>();
  for (const [sectionId, subtests] of subtestsBySection) {
    if (!subtests.length) continue;
    const rows = subtests.map((subtest) => {
      const inRange = perQuestion.filter((row) => row.sectionId === sectionId && row.questionNumber >= subtest.questionStart && row.questionNumber <= subtest.questionEnd);
      const correct = inRange.filter((row) => row.isCorrect).length;
      const blank = inRange.filter((row) => row.isBlank).length;
      const wrong = inRange.length - correct - blank;
      return { code: subtest.code, title: subtest.title, questionCount: inRange.length, correct, wrong, blank, net: round2(correct - wrong / penalty) };
    });
    result.set(sectionId, rows);
  }
  return result;
}
