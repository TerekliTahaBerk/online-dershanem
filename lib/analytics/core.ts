/**
 * FAZ 8 — Analytics Engine ortak yardımcıları.
 *
 * Tek bir userId/scope için trend hesaplama, EMA, basit forecast ve
 * "değişim sinyali" tespiti yapan utility'ler. Hiçbir DB sorgusu içermez —
 * pure functions; çağıran kod data'yı toplar, buraya verir.
 */

export type TrendDirection = "up" | "down" | "flat";

export type TrendDelta = {
  /** Mutlak fark (son - önceki). */
  abs: number;
  /** Yüzde olarak (önceki !== 0 değilse), aksi halde null. */
  pct: number | null;
  direction: TrendDirection;
};

export function safeDiv(a: number, b: number): number {
  return b === 0 || !Number.isFinite(b) ? 0 : a / b;
}

export function pct(part: number, whole: number): number {
  return Math.round(safeDiv(part, whole) * 100);
}

/** Son iki noktayı kıyaslar. */
export function deltaOf(prev: number, curr: number, eps = 0.01): TrendDelta {
  const abs = curr - prev;
  const pctVal = prev !== 0 ? Math.round((abs / Math.abs(prev)) * 100) : null;
  const direction: TrendDirection = abs > eps ? "up" : abs < -eps ? "down" : "flat";
  return { abs, pct: pctVal, direction };
}

/** Basit hareketli ortalama. */
export function movingAverage(series: number[], window = 3): number[] {
  if (series.length === 0) return [];
  const out: number[] = [];
  for (let i = 0; i < series.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = series.slice(start, i + 1);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    out.push(avg);
  }
  return out;
}

/**
 * Son N nokta üzerinde basit lineer regresyon eğimi (slope).
 * Pozitif = yükseliş, negatif = düşüş. Birim = "noktada birim".
 */
export function linearSlope(series: number[]): number {
  const n = series.length;
  if (n < 2) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += series[i];
    sumXY += i * series[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

/** Pozitif sayılar için "risk skoru" (0-100 normalize). */
export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function clampPct(x: number): number {
  return Math.max(0, Math.min(100, Math.round(x)));
}

/** Son N öğeden ortalama. */
export function tailAvg(series: number[], n = 3): number {
  if (series.length === 0) return 0;
  const slice = series.slice(-n);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

/** Sıralı bucket'larda gün/ay/haftaya göre boş seri oluşturma yardımcısı. */
export function fillDailyBuckets<T>(
  items: T[],
  days: number,
  pickIso: (t: T) => string,
): Array<{ iso: string; count: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const out: Array<{ iso: string; count: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    out.push({ iso: d.toISOString().slice(0, 10), count: 0 });
  }
  const idx = new Map(out.map((b, i) => [b.iso, i]));
  for (const it of items) {
    const key = pickIso(it);
    const i = idx.get(key);
    if (i !== undefined) out[i].count++;
  }
  return out;
}

/** Lokalize gün etiketi. */
export function shortDayLabel(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(d);
  } catch { return iso; }
}
