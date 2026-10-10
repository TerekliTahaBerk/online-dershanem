import type { MobileCoachingSession, MobileYonPreference, MobileYonTask, YonOverloadOption, YonRescheduleReason } from '@contracts/yon';
import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { ApiError } from '@/lib/api/errors';
import { completePlanTask, requestPlanChange, requestSessionReschedule, savePlanPreference, type TaskCompletionPayload } from '@/lib/api/yon';
import { useSession } from '@/lib/auth/session-provider';
import { newUuid } from '@/lib/ids';

import { keyForWrite, type PendingWrite } from '../od/assignments/model';
import { overloadRequest } from './model';
import { useInvalidateYon } from './shared';

export type WriteFeedback = { tone: 'success' | 'critical' | 'warning'; message: string } | null;

function messageOf(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/**
 * Plan görevi durumu — web Planım / Bugün ile AYNI uç
 * (`POST /api/panel/kocum/tasks/[id]/complete`) ve aynı gövde şeması.
 * Sunucu geçişi doğrular: tekrarlanan aynı istek NOOP (`repeated`), geçersiz
 * geçiş veya eşzamanlı değişiklik 409. 409'da yetkili durum yeniden yüklenir
 * ve açıklanır; otomatik tekrar yok; başarı yalnız sunucu onayıyla.
 * Görev bir OD ödevine bağlıysa ödev ilerlemesini sunucu aynı işlemde
 * günceller — istemci OD'ye ayrıca yazmaz, yalnız OD görünümlerini yeniler.
 */
export function useTaskCompletion(task: MobileYonTask | undefined) {
  const { api } = useSession();
  const invalidate = useInvalidateYon();
  const [feedback, setFeedback] = useState<WriteFeedback>(null);
  const mutation = useMutation({ mutationFn: (payload: TaskCompletionPayload) => completePlanTask(api, task!.id, payload) });

  async function submit(payload: TaskCompletionPayload): Promise<boolean> {
    if (!task || mutation.isPending) return false;
    setFeedback(null);
    try {
      const result = await mutation.mutateAsync(payload);
      setFeedback({
        tone: 'success',
        message:
          result.status === 'DONE'
            ? 'Harika — görev tamamlandı.'
            : result.status === 'PARTIAL'
              ? 'Kısmi tamamlanma kaydedildi.'
              : result.status === 'IN_PROGRESS'
                ? 'Göreve başladın.'
                : 'Durum kaydedildi.',
      });
      await invalidate({ alsoOd: task.linkedAssignment });
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.kind === 'conflict') {
        setFeedback({ tone: 'warning', message: `${error.message} Görevin son durumu yüklendi.` });
        await invalidate({ alsoOd: task.linkedAssignment });
        return false;
      }
      if (error instanceof ApiError && error.kind === 'not_found') await invalidate();
      setFeedback({ tone: 'critical', message: messageOf(error, 'Görev güncellenemedi. Tekrar dene.') });
      return false;
    }
  }

  return { submit, pending: mutation.isPending ? (mutation.variables?.status ?? null) : null, feedback, clearFeedback: () => setFeedback(null) };
}

/**
 * Plan değişiklik talebi — web ile aynı uç ve aynı seçenek eşlemesi
 * (`getOverloadRequest`). `expectedVersion` ekranın gördüğü son plan
 * sürümüdür; plan değiştiyse 409 → yeniden yükleme.
 */
export function usePlanChangeRequest(plan: { id: string; version: number } | null) {
  const { api } = useSession();
  const invalidate = useInvalidateYon();
  const [feedback, setFeedback] = useState<WriteFeedback>(null);
  const mutation = useMutation({
    mutationFn: (option: YonOverloadOption) => requestPlanChange(api, plan!.id, { ...overloadRequest(option), option, expectedVersion: plan!.version }),
  });

  async function submit(option: YonOverloadOption): Promise<boolean> {
    if (!plan || mutation.isPending) return false;
    setFeedback(null);
    try {
      await mutation.mutateAsync(option);
      setFeedback({ tone: 'success', message: 'Değişiklik talebin koçuna iletildi.' });
      await invalidate();
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.kind === 'conflict') await invalidate();
      setFeedback({ tone: error instanceof ApiError && error.kind === 'conflict' ? 'warning' : 'critical', message: messageOf(error, 'Talep iletilemedi.') });
      return false;
    }
  }

  return { submit, submitting: mutation.isPending, feedback };
}

/** Plan tercihleri — mevcut PATCH ucu; düzenlenmeyen alanlar sunucudaki değerleriyle geri gönderilir. */
export function usePreferenceSave() {
  const { api } = useSession();
  const invalidate = useInvalidateYon();
  const [feedback, setFeedback] = useState<WriteFeedback>(null);
  const mutation = useMutation({ mutationFn: (preference: MobileYonPreference) => savePlanPreference(api, preference) });

  async function save(preference: MobileYonPreference): Promise<boolean> {
    if (mutation.isPending) return false;
    setFeedback(null);
    try {
      await mutation.mutateAsync(preference);
      setFeedback({ tone: 'success', message: 'Tercihlerin kaydedildi.' });
      await invalidate();
      return true;
    } catch (error) {
      setFeedback({ tone: 'critical', message: messageOf(error, 'Tercihler kaydedilemedi.') });
      return false;
    }
  }

  return { save, saving: mutation.isPending, feedback };
}

/**
 * Görüşme saati değişikliği talebi — öğrenciye açık TEK görüşme eylemi
 * (`action: "REQUEST"`). `idempotencyKey` gerçek UUID; aynı görüşme + aynı
 * neden + aynı sürüm için yeniden denemede korunur (sunucu aynı anahtarı
 * ikinci kez uygulamaz). Sonucu belirsiz yazmada anahtar silinmez.
 */
export function useRescheduleRequest(session: MobileCoachingSession) {
  const { api } = useSession();
  const invalidate = useInvalidateYon();
  const pending = useRef<PendingWrite<{ id: string; reason: YonRescheduleReason; version: number }>>(null);
  const [feedback, setFeedback] = useState<WriteFeedback>(null);
  const mutation = useMutation({
    mutationFn: (input: { reason: YonRescheduleReason; key: string }) =>
      requestSessionReschedule(api, session.id, { reason: input.reason, expectedVersion: session.version, idempotencyKey: input.key }),
  });

  async function submit(reason: YonRescheduleReason): Promise<boolean> {
    if (mutation.isPending) return false;
    setFeedback(null);
    const input = { id: session.id, reason, version: session.version };
    const write = keyForWrite(pending.current, input, (a, b) => a.id === b.id && a.reason === b.reason && a.version === b.version, newUuid);
    pending.current = write.pending;
    try {
      await mutation.mutateAsync({ reason, key: write.key });
      pending.current = null;
      setFeedback({ tone: 'success', message: 'Saat değişikliği talebin koçuna iletildi.' });
      await invalidate();
      return true;
    } catch (error) {
      const transient = error instanceof ApiError && (error.transient || error.kind === 'invalid_response');
      if (!transient) pending.current = null;
      if (error instanceof ApiError && error.kind === 'conflict') {
        await invalidate();
        setFeedback({ tone: 'warning', message: `${error.message}` });
        return false;
      }
      setFeedback({ tone: 'critical', message: messageOf(error, 'Talep iletilemedi. Tekrar dene.') });
      return false;
    }
  }

  return { submit, submitting: mutation.isPending, feedback };
}
