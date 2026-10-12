import { parseTeacherInterventions, type TeacherInterventions } from '@contracts/teacher-interventions';
import { parseInterventionCreate, parseInterventionGenerate, parseInterventionUpdate } from '@contracts/admin';
import { useMutation } from '@tanstack/react-query';
import { useRef } from 'react';
import { PageHeader, Screen } from '@/design/primitives';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';
import { newUuid } from '@/lib/ids';
import { InterventionAdapterContext, InterventionBody, type InterventionAdapter } from '../../admin/interventions';
import type { useAdminMutation } from '../../admin/shared';
import { OfflineWriteNotice, QueryView, useInvalidateStaff, useOnline, usePullToRefresh, useStaffQuery } from '../shared';

function useTeacherMutation<V, R>(mutate: Parameters<typeof useAdminMutation<V, R>>[0]) {
  const { api } = useSession();
  const online = useOnline();
  const invalidate = useInvalidateStaff('OD');
  // Preserve the whole request closure (revision, case version and key) while its outcome is uncertain.
  // A background refetch may otherwise turn a manual-create retry into a second operation.
  const pending = useRef<{ variables: V; run: () => Promise<R> } | null>(null);
  return useMutation({
    networkMode: 'always',
    mutationFn: async (variables: V) => {
      if (!online) throw new ApiError({ kind: 'network' });
      if (pending.current && JSON.stringify(pending.current.variables) === JSON.stringify(variables)) return pending.current.run();
      const context = { idempotencyKey: newUuid() };
      pending.current = { variables, run: () => mutate(api, variables, context) };
      return pending.current.run();
    },
    onSuccess: async () => { pending.current = null; await invalidate(); },
    onError: async (error) => {
      const uncertain = error instanceof ApiError && (error.transient || error.kind === 'invalid_response');
      if (!uncertain) pending.current = null;
      if (error instanceof ApiError && error.kind === 'conflict') await invalidate();
    },
  });
}
const path = '/api/panel/staff/teacher/interventions';
export default function TeacherInterventionsScreen() {
  const query = useStaffQuery('OD', 'teacher-interventions', async (api, signal) => {
    const parsed = parseTeacherInterventions(await api.request(path, { signal }));
    if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' });
    return parsed.value;
  });
  const refresh = usePullToRefresh(() => query.refetch());
  return <Screen testID="teacher-interventions" refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>
    <PageHeader title="Müdahale" description="Öğrencilerinin sinyallerini incele; takip adımını ve sonucu kaydet." />
    <QueryView query={query}>{(data) => <TeacherBody data={data} />}</QueryView>
  </Screen>;
}
function TeacherBody({ data }: { data: TeacherInterventions }) {
  const online = useOnline();
  const headers = (key: string) => ({ 'X-Od-Idempotency-Key': key, 'X-Od-Expected-Revision': data.revision });
  const adapter: InterventionAdapter = {
    useMutation: useTeacherMutation,
    disabled: !online,
    create: async (api, input, context) => {
      const parsed = parseInterventionCreate(await api.request(path, { method: 'POST', body: { operation: 'create', input }, headers: headers(context.idempotencyKey) }));
      if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' });
      return parsed.value.id;
    },
    update: async (api, id, expectedVersion, patch, context) => {
      const parsed = parseInterventionUpdate(await api.request(path, { method: 'POST', body: { operation: 'update', id, input: { ...patch, expectedVersion } }, headers: headers(context.idempotencyKey) }));
      if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' });
    },
    generate: async (api, context) => {
      const parsed = parseInterventionGenerate(await api.request(path, { method: 'POST', body: { operation: 'generate' }, headers: headers(context.idempotencyKey) }));
      if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' });
      return parsed.value;
    },
  };
  return <InterventionAdapterContext.Provider value={adapter}>
    <OfflineWriteNotice online={online} /><InterventionBody inbox={data} prefix="teacher" />
  </InterventionAdapterContext.Provider>;
}
