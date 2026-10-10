import type { MobileParentChild } from '@contracts/parent';
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { fetchParentChildren } from '@/lib/api/parent';
import type { ApiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { queryKeys } from '@/lib/query/keys';

/**
 * VELİ ÇOCUK BAĞLAMI (M6).
 *
 * GÜVENLİK İLKELERİ
 *  - Seçici YETKİ SINIRI DEĞİLDİR: her istek `studentId` taşır ve sunucu onu
 *    velinin bağlantıları arasında yeniden çözer (bağlı değil → 404
 *    `CHILD_NOT_FOUND`).
 *  - Seçim yalnız BELLEKTE tutulur (cihaz depolamasına çocuk verisi / kimliği
 *    yazılmaz). Uygulama yeniden açılınca ilk çocuk seçilir.
 *  - İlk çocuk YALNIZ açık bir seçim hiç yapılmamışken varsayılır. Seçili
 *    çocuğun erişimi düşerse başka çocuğa SESSİZCE geçilmez: veri gösterimi
 *    durur, o çocuğun önbelleği silinir, liste yenilenir ve "erişim değişti"
 *    durumu gösterilir (çocuk kalırsa açık seçim istenir).
 *  - Sorgu anahtarı veli kimliği + PARENT + çocuk kimliği + kaynak içerir;
 *    çocuk değişince önceki çocuğun verisi bir an bile gösterilmez
 *    (`placeholderData` / önceki veri kullanılmaz) ve önceki çocuğun önbelleği
 *    bellekten silinir.
 */
export type ParentContextStatus = 'loading' | 'error' | 'no-children' | 'select' | 'ready';

type ParentContextValue = {
  status: ParentContextStatus;
  children: MobileParentChild[];
  selected: MobileParentChild | null;
  /** Seçili çocuğun erişimi bu oturumda düştü. */
  revoked: boolean;
  childrenQuery: UseQueryResult<{ children: MobileParentChild[] }>;
  selectChild: (studentId: string) => void;
  /** Çocuk kapsamlı bir sorgu hata verdiğinde çağrılır (yetki düşmesi tespiti). */
  reportError: (studentId: string, error: unknown) => void;
  /** Bildirim gibi GÜVENİLİR sunucu verisinden gelen çocuk: yalnız güncel listedeyse seçilir. */
  selectFromTrustedSource: (studentId: string) => Promise<boolean>;
};

const ParentContext = createContext<ParentContextValue | null>(null);

export function isChildNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'CHILD_NOT_FOUND';
}

export function ParentContextProvider({ children }: PropsWithChildren) {
  const bootstrap = useReadyBootstrap();
  if (bootstrap.user.role !== 'PARENT') return <>{children}</>;
  return <ParentContextInner userId={bootstrap.user.id}>{children}</ParentContextInner>;
}

function ParentContextInner({ userId, children: content }: PropsWithChildren<{ userId: string }>) {
  const { api, refreshBootstrap } = useSession();
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revoked, setRevoked] = useState(false);
  const explicit = useRef(false);

  const childrenQuery = useQuery({ queryKey: queryKeys.parentChildren(userId), queryFn: ({ signal }) => fetchParentChildren(api, signal) });
  const list = useMemo(() => childrenQuery.data?.children ?? [], [childrenQuery.data]);

  const forgetChild = useCallback((studentId: string) => {
    void client.cancelQueries({ queryKey: queryKeys.parentChild(userId, studentId) });
    client.removeQueries({ queryKey: queryKeys.parentChild(userId, studentId) });
  }, [client, userId]);

  // Liste her güncellendiğinde seçimi yeniden doğrula.
  useEffect(() => {
    if (!childrenQuery.data) return;
    if (selectedId && !list.some((child) => child.studentId === selectedId)) {
      forgetChild(selectedId);
      setSelectedId(null);
      setRevoked(true);
      return;
    }
    if (!selectedId && !explicit.current && !revoked && list.length > 0) setSelectedId(list[0].studentId);
  }, [childrenQuery.data, list, selectedId, revoked, forgetChild]);

  const selectChild = useCallback((studentId: string) => {
    if (!list.some((child) => child.studentId === studentId)) return;
    explicit.current = true;
    setSelectedId((previous) => {
      if (previous && previous !== studentId) forgetChild(previous);
      return studentId;
    });
    setRevoked(false);
  }, [list, forgetChild]);

  const reportError = useCallback((studentId: string, error: unknown) => {
    if (!isChildNotFound(error)) return;
    forgetChild(studentId);
    setSelectedId((previous) => (previous === studentId ? null : previous));
    setRevoked(true);
    explicit.current = true;
    void childrenQuery.refetch();
    void refreshBootstrap();
  }, [forgetChild, childrenQuery, refreshBootstrap]);

  const selectFromTrustedSource = useCallback(async (studentId: string) => {
    const fresh = await childrenQuery.refetch();
    const known = fresh.data?.children.some((child) => child.studentId === studentId) ?? false;
    if (!known) return false;
    explicit.current = true;
    setSelectedId((previous) => {
      if (previous && previous !== studentId) forgetChild(previous);
      return studentId;
    });
    setRevoked(false);
    return true;
  }, [childrenQuery, forgetChild]);

  const selected = list.find((child) => child.studentId === selectedId) ?? null;
  const status: ParentContextStatus = childrenQuery.data
    ? list.length === 0
      ? 'no-children'
      : selected
        ? 'ready'
        : 'select'
    : childrenQuery.error
      ? 'error'
      : 'loading';

  const value = useMemo<ParentContextValue>(
    () => ({ status, children: list, selected, revoked, childrenQuery, selectChild, reportError, selectFromTrustedSource }),
    [status, list, selected, revoked, childrenQuery, selectChild, reportError, selectFromTrustedSource],
  );
  return <ParentContext.Provider value={value}>{content}</ParentContext.Provider>;
}

/** Veli ekranları içinde kullanılır; veli dışı rolde null. */
export function useParentContext(): ParentContextValue | null {
  return useContext(ParentContext);
}

/**
 * Seçili çocuğa ait kaynak sorgusu. Çocuk seçili değilken çalışmaz.
 * `CHILD_NOT_FOUND` → bağlam yetki düşmesini işler (veri gösterimi durur).
 */
export function useParentQuery<T>(resource: string, fetcher: (api: ApiClient, studentId: string, signal: AbortSignal) => Promise<T>, options: { gcTime?: number } = {}) {
  const bootstrap = useReadyBootstrap();
  const { api } = useSession();
  const context = useParentContext();
  const studentId = context?.selected?.studentId ?? null;
  const query = useQuery({
    queryKey: queryKeys.parentResource(bootstrap.user.id, studentId ?? 'none', resource),
    queryFn: ({ signal }) => fetcher(api, studentId!, signal),
    enabled: Boolean(studentId),
    retry: (count, error) => !isChildNotFound(error) && (!(error instanceof ApiError) || error.transient) && count < 2,
    ...(options.gcTime !== undefined ? { gcTime: options.gcTime } : {}),
  });
  const report = context?.reportError;
  useEffect(() => {
    if (studentId && query.error && report) report(studentId, query.error);
  }, [studentId, query.error, report]);
  return query;
}
