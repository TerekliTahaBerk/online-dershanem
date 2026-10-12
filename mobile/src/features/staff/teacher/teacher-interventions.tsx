import { parseTeacherInterventions, type TeacherInterventions } from '@contracts/teacher-interventions';
import { parseInterventionCreate, parseInterventionGenerate, parseInterventionUpdate } from '@contracts/admin';
import { useMutation } from '@tanstack/react-query';
import { createContext, useContext } from 'react';
import { PageHeader, Screen } from '@/design/primitives';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';
import { InterventionAdapterContext, InterventionBody, type InterventionAdapter } from '../../admin/interventions';
import type { useAdminMutation } from '../../admin/shared';
import { OfflineWriteNotice, QueryView, useInvalidateStaff, useOnline, usePullToRefresh, useStableKey, useStaffQuery } from '../shared';

const RevisionContext = createContext('');
function useTeacherMutation<V, R>(mutate: Parameters<typeof useAdminMutation<V, R>>[0]) {
  const { api } = useSession();
  const revision = useContext(RevisionContext);
  const online = useOnline();
  const invalidate = useInvalidateStaff('OD');
  const stable = useStableKey<{ variables: V; revision: string }>((a, b) => JSON.stringify(a) === JSON.stringify(b));
  return useMutation({
    networkMode: 'always',
    mutationFn: async (variables: V) => {
      if (!online) throw new ApiError({ kind: 'network' });
      return mutate(api, variables, { idempotencyKey: stable.keyFor({ variables, revision }) });
    },
    onSuccess: async () => { stable.settle(); await invalidate(); },
    onError: async (error) => { stable.settle(error); if (error instanceof ApiError && error.kind === 'conflict') await invalidate(); },
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
  return <RevisionContext.Provider value={data.revision}><InterventionAdapterContext.Provider value={adapter}>
    <OfflineWriteNotice online={online} /><InterventionBody inbox={data} prefix="teacher" />
  </InterventionAdapterContext.Provider></RevisionContext.Provider>;
}
