import type { MobileYonTask, YonCompletionField, YonCompleteStatus, YonOverloadOption } from '@contracts/yon';

import type { Tone } from '@/design/tokens';

/**
 * Yön — sunum etiketleri. Kopyalar web ile aynıdır
 * (`lib/kocum/plan-tasks.ts#taskStatusLabel`,
 * `components/panel/student-adaptive-plan/constants.ts`). Yeni iş kuralı yok.
 */
export const TASK_STATUS_LABEL: Record<MobileYonTask['status'], string> = {
  PLANNED: 'Başlamadım',
  IN_PROGRESS: 'Başladım',
  DONE: 'Tamamladım',
  PARTIAL: 'Kısmen tamamladım',
  COULD_NOT: 'Yapamadım',
  SKIPPED: 'Yeniden planlanacak',
};

export function taskTone(status: MobileYonTask['status']): Tone {
  if (status === 'DONE' || status === 'PARTIAL') return 'success';
  if (status === 'IN_PROGRESS') return 'info';
  if (status === 'COULD_NOT') return 'warning';
  return 'neutral';
}

export const isOpenTask = (task: Pick<MobileYonTask, 'status'>) => task.status === 'PLANNED' || task.status === 'IN_PROGRESS';
export const isDoneTask = (task: Pick<MobileYonTask, 'status'>) => task.status === 'DONE' || task.status === 'PARTIAL';

export const PRIORITY_LABEL: Partial<Record<MobileYonTask['priority'], string>> = { HIGH: 'Yüksek', URGENT: 'Acil' };

export const FIELD_LABEL: Record<YonCompletionField, string> = {
  actualQuestions: 'Çözülen soru',
  actualCorrect: 'Doğru',
  actualIncorrect: 'Yanlış',
  actualBlank: 'Boş',
  actualMinutes: 'Kaç dakika sürdü?',
  studentNote: 'Notun',
  difficultyFelt: 'Ne kadar zordu? (1–5)',
  energyFelt: 'Nasıl hissettin? (1–5)',
};

export const COMPLETE_LABEL: Record<Exclude<YonCompleteStatus, 'IN_PROGRESS'>, string> = {
  DONE: 'Tamamladım',
  PARTIAL: 'Kısmen',
  COULD_NOT: 'Yapamadım',
};

export const OVERLOAD_LABEL: Record<YonOverloadOption, string> = {
  REDUCE_LIGHT: 'Biraz azalt',
  REDUCE_HEAVY: 'Çok azalt',
  CHANGE_DAYS: 'Günleri değiştirmek istiyorum',
};

/** Web `getOverloadRequest` ile aynı eşleme (`lib/adaptive-plan-overload.ts`). */
export function overloadRequest(option: YonOverloadOption): { category: 'TOO_MUCH' | 'WRONG_DAYS'; overwhelmPulse: 4 | 5 } {
  if (option === 'CHANGE_DAYS') return { category: 'WRONG_DAYS', overwhelmPulse: 4 };
  if (option === 'REDUCE_HEAVY') return { category: 'TOO_MUCH', overwhelmPulse: 5 };
  return { category: 'TOO_MUCH', overwhelmPulse: 4 };
}

export const CHANGE_CATEGORY_LABEL: Record<string, string> = {
  TOO_MUCH: 'Plan fazla yoğun',
  WRONG_DAYS: 'Günler bana uymuyor',
  PRIORITY: 'Öncelik doğru görünmüyor',
  OTHER: 'Başka bir neden',
};

export const WEEK_DAYS = [
  { id: 1, label: 'Pzt' },
  { id: 2, label: 'Sal' },
  { id: 3, label: 'Çar' },
  { id: 4, label: 'Per' },
  { id: 5, label: 'Cum' },
  { id: 6, label: 'Cmt' },
  { id: 7, label: 'Paz' },
];

export const RESCHEDULE_REASON_LABEL = {
  SCHOOL_SCHEDULE: 'Ders veya okul saatim değişti',
  FAMILY_SCHEDULE: 'Aile programımızla çakışıyor',
  TECH_ACCESS: 'Katılım için teknik desteğe ihtiyacım var',
} as const;

export function taskMeta(task: MobileYonTask, options: { time?: string | null; date?: string | null } = {}): string | null {
  const parts = [options.date ?? null, options.time ?? null, task.subject, task.topic, task.targetLabel].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

/** Görev detay rotası; kimlik yalnız URL-güvenli karakterlerle. */
export function taskHref(taskId: string): string | null {
  return /^[\w-]{1,64}$/.test(taskId) ? `/yon/task/${taskId}` : null;
}

/** Tamamlama formu: boş metin → null; sayısal alan tam sayı değilse hata. */
export function parseCompletionDraft(fields: YonCompletionField[], draft: Partial<Record<YonCompletionField, string>>): { values: Partial<Record<YonCompletionField, number | string | null>>; error: string | null } {
  const values: Partial<Record<YonCompletionField, number | string | null>> = {};
  for (const field of fields) {
    const raw = (draft[field] ?? '').trim();
    if (field === 'studentNote') {
      values.studentNote = raw || null;
      continue;
    }
    if (!raw) {
      values[field] = null;
      continue;
    }
    if (!/^\d+$/.test(raw)) return { values, error: `${FIELD_LABEL[field]} için bir tam sayı yazar mısın?` };
    values[field] = Number(raw);
  }
  return { values, error: null };
}
