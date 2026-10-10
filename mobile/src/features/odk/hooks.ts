import type { MobileOdkRecommendationTarget } from '@contracts/odk';
import type { MobileProductCode } from '@contracts/bootstrap';
import { useRouter, type Href } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';

import { answerKeyPath } from '@/lib/api/odk';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { downloadAnswerKeyFile } from '@/lib/files/material-files';
import { reviewRecoveryHref } from '@/navigation/od-targets';

/**
 * Cevap anahtarı PDF'i — mevcut uç (`/api/odk/student/exams/[id]/answer-key`)
 * aktif hakkı ve BAĞIMSIZ cevap anahtarı yayın politikasını kendisi doğrular.
 * İndirme yalnız `Authorization: Bearer` başlığıyla (token URL'de değil),
 * kullanıcıya ayrılmış önbellek dizinine; çıkışta / hesap değişiminde silinir.
 * Sonuç yanıtındaki `answerKey.available` yalnız düğmeyi gösterir, yetki vermez.
 */
export function useAnswerKeyOpener(examId: string) {
  const { api } = useSession();
  const bootstrap = useReadyBootstrap();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    if (opening || !api.baseUrl) return;
    setOpening(true);
    setError(null);
    try {
      const file = await downloadAnswerKeyFile({ baseUrl: api.baseUrl, path: answerKeyPath(examId), headers: api.authHeaders(), userId: bootstrap.user.id, examId });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: 'Cevap anahtarı' });
      else setError('Bu cihazda PDF açabilecek bir uygulama bulunamadı.');
    } catch {
      setError('Cevap anahtarı açılamadı. Henüz yayınlanmamış olabilir veya bağlantı kesildi.');
    } finally {
      setOpening(false);
    }
  }

  return { open, opening, error };
}

const PRODUCT_OF: Partial<Record<MobileOdkRecommendationTarget['type'], MobileProductCode>> = { 'yon-plan': 'OK', 'od-review': 'OD', 'od-recovery': 'OD' };

/**
 * Sonuçtan çapraz ürün adımı (Yön planı, OD tekrar / telafi). Kurallar:
 *  - Yalnız öğrencinin ilgili ürünü ACTIVE ise gösterilir (sunucu önerileri de
 *    yalnız erişilen ürünlerle kurar).
 *  - Açılışta mevcut çalışma alanı geçişi (`selectWorkspace`, sunucuya yazar)
 *    kullanılır; hedef YENİ menüde merkezi rota kapılarıyla tekrar doğrulanır
 *    (`/screen/[id]`, `OdRouteGate`). Görev / tekrar öğesi OLUŞTURULMAZ.
 */
export function useCrossProductOpen() {
  const bootstrap = useReadyBootstrap();
  const { selectWorkspace } = useSession();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productFor = (target: MobileOdkRecommendationTarget) => PRODUCT_OF[target.type] ?? null;
  const available = (target: MobileOdkRecommendationTarget) => {
    const product = productFor(target);
    return Boolean(product && (bootstrap.workspace?.products ?? []).some((item) => item.code === product && item.state === 'ACTIVE'));
  };

  async function open(target: MobileOdkRecommendationTarget) {
    const product = productFor(target);
    if (!product || !available(target) || pending) return;
    setPending(true);
    setError(null);
    try {
      await selectWorkspace(product);
      const href =
        target.type === 'yon-plan' ? '/screen/plan' : target.type === 'od-review' ? reviewRecoveryHref('tekrar') : target.type === 'od-recovery' ? reviewRecoveryHref('telafi', target.lessonId) : null;
      if (href) router.replace(href as Href);
    } catch {
      setError('Çalışma alanı değiştirilemedi. Bağlantını kontrol edip tekrar dene.');
    } finally {
      setPending(false);
    }
  }

  return { available, open, pending, error };
}
