import { runJob } from "@/lib/jobs/runner";
import { runAccountClaimMaintenance } from "@/lib/od/account-claim-server";

/**
 * Hesap devralma davetlerinin bakımı (OD-013).
 *
 * İki iş yapar: süresi dolan davetleri kapatır ve zamanı gelenlere hatırlatma
 * yollar. Süresi dolmuş davet, operasyonun istisna kuyruğunda görünmesi
 * gereken TEK "hesap kurulamadı" sinyalidir; o yüzden kalıcı durum saatle
 * eşitlenir.
 *
 * Altı saatte bir yeterli: hatırlatma basamakları gün ölçeğindedir ve daha sık
 * koşmak yalnız aynı sonucu tekrar hesaplar.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  return runJob("account-claims", request, () => runAccountClaimMaintenance(), {
    metrics: (result) => ({ processedCount: result.expired + result.reminded }),
  });
}
