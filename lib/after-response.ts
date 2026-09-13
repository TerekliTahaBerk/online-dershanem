import "server-only";

import { after } from "next/server";

import { log } from "@/lib/logger";

/**
 * Yanıt gönderildikten SONRA koşacak yan etkiler.
 *
 * NEDEN: bu iş eskiden `void someAsyncCall()` ile başlatılıyordu. Sunucusuz
 * çalışma zamanı yanıt döndükten sonra çağrıyı askıya alabildiği için o
 * promise'in tamamlanacağının hiçbir garantisi yoktu — ders kapanışının
 * `LESSON_COMPLETED` olayı veya ödevin `ASSIGNMENT_CREATED` olayı outbox'a hiç
 * yazılmadan düşebiliyordu. `after()` işi çalışma zamanına bildirir; hata
 * çıksa bile çalışır ve iş bitene kadar invocation canlı tutulur.
 *
 * Ayrıca `void promise` reddedildiğinde ortaya çıkan "unhandled rejection"
 * riskini kaldırır: burada hata yakalanır ve yapılandırılmış log'a yazılır.
 * Bu yan etkiler iş işlemini GERİ ALMAZ; ders zaten kapanmıştır.
 */
export function afterResponse(
  event: string,
  work: () => Promise<unknown>,
  context?: Record<string, unknown>,
): void {
  const guarded = async () => {
    try {
      await work();
    } catch (error) {
      log.error(event, error, context);
    }
  };
  try {
    after(guarded);
  } catch {
    // `after()` istek kapsamı dışında SENKRON fırlatır (test, script, cron).
    // O bağlamda zaten askıya alınma riski yok; işi başlatıp bırakmak yeterli.
    void guarded();
  }
}

/**
 * İstek bağlamı olmayan yerler (cron, webhook, kütüphane içi) için: `after()`
 * çağrılamaz, ama reddedilen bir promise'i de başıboş bırakmamak gerekir.
 */
export function detached(
  event: string,
  work: Promise<unknown>,
  context?: Record<string, unknown>,
): void {
  void work.catch((error: unknown) => log.error(event, error, context));
}
