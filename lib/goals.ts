/**
 * ÖĞRENCİ HEDEFLERİ — saf ilerleme mantığı.
 *
 * Sunucu sorguları `lib/panel/goals.ts` içinde; burada veritabanına dokunmayan,
 * test edilebilir hesap durur (`adaptive-plan` / `coaching` ile aynı ayrım).
 */

export type GoalBand = "met" | "close" | "behind";

export type GoalProgress = {
  /** 0–100 arası, çubuk genişliği için. Hedef 0 ise 0 döner. */
  percent: number;
  band: GoalBand;
};

/**
 * "Hedefe ne kadar yakın?" — çubuk genişliği ve renk bandı.
 *
 * `CLOSE_THRESHOLD` tasarımın kendi örneklerinden türetildi: 19/25 (%76)
 * kehribar, 30,75/32 (%96) ve 78/90 (%87) yeşil çiziliyordu. Eşik bu ikisinin
 * arasındadır; 85 seçildi.
 *
 * Şu anki değer BİLİNMİYORSA (`current === null`) ilerleme İDDİA EDİLMEZ —
 * `percent: 0` ve `behind` yerine çağıran taraf durumu ayrıca ele alır.
 */
const CLOSE_THRESHOLD = 85;

export function goalProgress(current: number, target: number): GoalProgress {
  if (target <= 0) return { percent: 0, band: "behind" };
  const raw = (current / target) * 100;
  const percent = Math.max(0, Math.min(100, Math.round(raw)));
  if (current >= target) return { percent: 100, band: "met" };
  return { percent, band: percent >= CLOSE_THRESHOLD ? "close" : "behind" };
}

/** TYT/AYT net kuralı: doğru − yanlış/4. */
export function netScore(correctCount: number, incorrectCount: number): number {
  return correctCount - incorrectCount / 4;
}
