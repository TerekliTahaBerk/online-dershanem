import type { AssignmentProgressStatus, MobileAssignment } from '@contracts/student';
import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { fetchAssignments, submitAssignmentEvidence, updateAssignmentProgress } from '@/lib/api/student';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';
import { newUuid } from '@/lib/ids';

import { useInvalidateOd, useOdQuery } from '../shared';
import { keyForWrite, type PendingWrite } from './model';

export function useAssignments() {
  return useOdQuery('assignments', (api, signal) => fetchAssignments(api, signal));
}

export type WriteFeedback = { tone: 'success' | 'critical' | 'warning'; message: string } | null;

const CONFLICT = 'ASSIGNMENT_PROGRESS_CONFLICT';

/**
 * İlerleme yazması — sunucunun eşzamanlılık sözleşmesiyle:
 *  - `expectedVersion`: ekranın gördüğü SON sunucu sürümü,
 *  - `mutationKey`: gerçek UUID; aynı mantıksal yazmanın tekrarında aynı.
 * 409 `ASSIGNMENT_PROGRESS_CONFLICT` → yetkili durum yeniden yüklenir ve
 * öğrenciye açıklanır; yeni seçim kullanıcıdan beklenir (sessiz üzerine
 * yazma yok). Otomatik tekrar yok; başarı yalnız sunucu onayıyla.
 */
export function useProgressWrite(assignment: MobileAssignment | undefined) {
  const { api } = useSession();
  const invalidate = useInvalidateOd();
  const pending = useRef<PendingWrite<{ id: string; status: AssignmentProgressStatus; version: number }>>(null);
  const [feedback, setFeedback] = useState<WriteFeedback>(null);
  const mutation = useMutation({
    mutationFn: (input: { assignmentId: string; status: AssignmentProgressStatus; expectedVersion: number; mutationKey: string }) => updateAssignmentProgress(api, input),
  });

  async function setStatus(status: AssignmentProgressStatus) {
    if (!assignment || mutation.isPending) return;
    setFeedback(null);
    const input = { id: assignment.id, status, version: assignment.version };
    const write = keyForWrite(pending.current, input, (a, b) => a.id === b.id && a.status === b.status && a.version === b.version, newUuid);
    pending.current = write.pending;
    try {
      await mutation.mutateAsync({ assignmentId: assignment.id, status, expectedVersion: assignment.version, mutationKey: write.key });
      pending.current = null;
      setFeedback({ tone: 'success', message: status === 'DONE' ? 'Çalışma tamamlandı olarak kaydedildi.' : 'İlerlemen kaydedildi.' });
      await invalidate();
    } catch (error) {
      const transient = error instanceof ApiError && (error.transient || error.kind === 'invalid_response');
      // Sonucu belirsiz (ağ / zaman aşımı) yazmada anahtar KORUNUR: kullanıcı
      // tekrar denerse sunucu aynı yazmayı ikinci kez uygulamaz.
      if (!transient) pending.current = null;
      if (error instanceof ApiError && error.code === CONFLICT) {
        setFeedback({ tone: 'warning', message: 'Bu çalışmanın durumu başka bir yerde (ör. web panelinde) değişti. Son durum yüklendi; yeniden seçebilirsin.' });
        await invalidate();
        return;
      }
      if (error instanceof ApiError && error.kind === 'conflict') await invalidate();
      setFeedback({ tone: 'critical', message: error instanceof ApiError ? error.message : 'Durum kaydedilemedi. Tekrar dene.' });
    }
  }

  return { setStatus, pendingStatus: mutation.isPending ? mutation.variables?.status ?? null : null, feedback, clearFeedback: () => setFeedback(null) };
}

/**
 * Kanıt gönderimi — `idempotencyKey` aynı metnin tekrarında yeniden
 * kullanılır; başarılı gönderimden sonra sıfırlanır. Gönderim sürerken düğme
 * devre dışıdır (çift dokunma = çift kayıt olmaz). Sunucu ayrıca
 * değerlendirmedeki teslim varken ikinci teslimi 409 ile reddeder.
 */
export function useEvidenceSubmit(assignment: MobileAssignment | undefined) {
  const { api } = useSession();
  const invalidate = useInvalidateOd();
  const pending = useRef<PendingWrite<{ id: string; text: string }>>(null);
  const [feedback, setFeedback] = useState<WriteFeedback>(null);
  const mutation = useMutation({
    mutationFn: (input: { assignmentId: string; textEvidence: string; idempotencyKey: string }) => submitAssignmentEvidence(api, input),
  });

  async function submit(text: string): Promise<boolean> {
    if (!assignment || mutation.isPending) return false;
    setFeedback(null);
    const textEvidence = text.trim();
    const write = keyForWrite(pending.current, { id: assignment.id, text: textEvidence }, (a, b) => a.id === b.id && a.text === b.text, newUuid);
    pending.current = write.pending;
    try {
      const result = await mutation.mutateAsync({ assignmentId: assignment.id, textEvidence, idempotencyKey: write.key });
      pending.current = null;
      setFeedback({ tone: 'success', message: result.attemptNumber > 1 ? 'Yeni denemen öğretmenine gönderildi.' : 'Kanıtın öğretmen değerlendirmesine gönderildi.' });
      await invalidate();
      return true;
    } catch (error) {
      const transient = error instanceof ApiError && (error.transient || error.kind === 'invalid_response');
      if (!transient) pending.current = null;
      if (error instanceof ApiError && error.kind === 'conflict') await invalidate();
      setFeedback({ tone: 'critical', message: error instanceof ApiError ? error.message : 'Kanıt gönderilemedi. Tekrar dene.' });
      return false;
    }
  }

  return { submit, submitting: mutation.isPending, feedback };
}
