import { useQuery } from '@tanstack/react-query';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import type { ApiClient } from '@/lib/api/client';
export function useOdkManagementQuery<T>(resource: string, fetcher: (api: ApiClient, signal: AbortSignal) => Promise<T>, options: { gcTime?: number; refetchInterval?: number | false } = {}) {
  const { api } = useSession(); const bootstrap = useReadyBootstrap();
  return useQuery({ ...options, queryKey: ['user', bootstrap.user.id, 'workspace', 'ODK', 'management', bootstrap.user.role, resource], enabled: ['ADMIN', 'TEACHER'].includes(bootstrap.user.role) && bootstrap.workspace?.activeProduct === 'ODK', queryFn: ({ signal }) => fetcher(api, signal) });
}

/** Web deneme çalışma alanı yolu (`/panel/odk/yonetim/sinavlar/<id>?sekme=`) → native K03 ekranı. */
export function workspaceTarget(webHref: string): string {
  const match = /^\/panel\/odk\/yonetim\/sinavlar\/([\w-]{1,64})(?:\?sekme=([a-z]{1,20}))?/.exec(webHref);
  if (!match) return '/';
  return `/odk/manage/${match[1]}${match[2] ? `?tab=${match[2]}` : ''}`;
}
