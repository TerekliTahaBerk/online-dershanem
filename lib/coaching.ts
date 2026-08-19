/**
 * ONLINE KOÇUM — saf koçluk kuralları.
 *
 * Sunucuya bağlı sorgular `lib/panel/coaching.ts` içinde; burada yalnız
 * veritabanına dokunmayan, test edilebilir mantık durur (repodaki
 * `adaptive-plan.ts` / `adaptive-plan-server.ts` ayrımıyla aynı).
 */

export type CoachingOverdue = { overdue: boolean; overdueDays: number | null };

const DAY_MS = 86_400_000;

/**
 * Bir koçluk görüşmesi gecikmiş mi?
 *
 * Sıra önemlidir:
 *  1. Planlanmış görüşmenin tarihi geçtiyse gecikme KESİNDİR — sıklık bilgisi
 *     gerekmez, çünkü somut bir randevu kaçırılmıştır.
 *  2. İleri tarihli bir plan varsa gecikme yoktur.
 *  3. Plan yoksa son görüşmenin üzerinden `cadenceDays` geçtiyse gecikmiştir.
 *
 * `cadenceDays` boşsa (ön görüşmede sıklık belirlenmemişse) 3. kural
 * çalışmaz ve gecikme İDDİA EDİLMEZ — uydurma bir varsayılan sıklık yoktur.
 */
export function coachingOverdue(
  lastCompletedAt: Date | null,
  nextScheduledAt: Date | null,
  cadenceDays: number | null,
  now: Date = new Date(),
): CoachingOverdue {
  if (nextScheduledAt && nextScheduledAt < now) {
    return {
      overdue: true,
      overdueDays: Math.floor((now.getTime() - nextScheduledAt.getTime()) / DAY_MS),
    };
  }
  if (nextScheduledAt) return { overdue: false, overdueDays: null };
  if (!cadenceDays || cadenceDays <= 0 || !lastCompletedAt) {
    return { overdue: false, overdueDays: null };
  }
  const due = new Date(lastCompletedAt.getTime() + cadenceDays * DAY_MS);
  if (due >= now) return { overdue: false, overdueDays: null };
  return { overdue: true, overdueDays: Math.floor((now.getTime() - due.getTime()) / DAY_MS) };
}
