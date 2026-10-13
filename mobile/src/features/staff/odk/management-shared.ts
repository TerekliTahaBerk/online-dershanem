import { useQuery } from '@tanstack/react-query';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import type { ApiClient } from '@/lib/api/client';
export function useOdkManagementQuery<T>(resource: string, fetcher: (api: ApiClient, signal: AbortSignal) => Promise<T>, options: { gcTime?: number } = {}) {
  const { api } = useSession(); const bootstrap = useReadyBootstrap();
  return useQuery({ ...options, queryKey: ['user', bootstrap.user.id, 'workspace', 'ODK', 'management', bootstrap.user.role, resource], enabled: ['ADMIN', 'TEACHER'].includes(bootstrap.user.role) && bootstrap.workspace?.activeProduct === 'ODK', queryFn: ({ signal }) => fetcher(api, signal) });
}
