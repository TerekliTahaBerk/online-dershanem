import type { MobileOdkExamRow } from '@contracts/odk';

/**
 * Deneme Ligi — yalnız SUNUM yardımcıları. Durum, sıralama, yayın ve
 * karşılaştırma kararları sunucudadır; burada yeniden türetilmez.
 */
const NET = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatNet = (value: number) => NET.format(value);

export function formatDelta(delta: number | null): string | null {
  if (delta === null) return null;
  return `${delta >= 0 ? '+' : '−'}${NET.format(Math.abs(delta))}`;
}

export function deltaTone(delta: number | null): 'success' | 'warning' | 'neutral' {
  if (delta === null) return 'neutral';
  return delta >= 0 ? 'success' : 'warning';
}

export function formatDurationMs(ms: number | null | undefined): string | null {
  if (!ms) return null;
  const minutes = Math.round(ms / 60000);
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours} sa ${minutes % 60} dk` : `${minutes} dk`;
}

const SAFE_ID = /^[\w-]{1,64}$/;
export const isSafeExamId = (value: unknown): value is string => typeof value === 'string' && SAFE_ID.test(value);

export function examHref(examId: string): string | null {
  return isSafeExamId(examId) ? `/odk/exam/${examId}` : null;
}

export function resultHref(examId: string): string | null {
  return isSafeExamId(examId) ? `/odk/exam/${examId}/result` : null;
}

/** Satırdan gidilecek native hedef: açıklanmış sonuç → sonuç ekranı; diğerleri → ayrıntı. */
export function rowHref(row: Pick<MobileOdkExamRow, 'id' | 'state'>): string | null {
  return row.state.key === 'RESULT_RELEASED' ? resultHref(row.id) : examHref(row.id);
}

export function minutesLeft(deadlineAt: string | null, now: Date): number | null {
  if (!deadlineAt) return null;
  return Math.max(0, Math.round((Date.parse(deadlineAt) - now.getTime()) / 60000));
}
