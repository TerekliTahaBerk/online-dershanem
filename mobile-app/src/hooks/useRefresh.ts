import { useCallback, useState } from "react";

/**
 * Pull-to-refresh boilerplate'ini sadeleştiren hook.
 * Ekran:
 *   const { refreshing, onRefresh } = useRefresh(refetch);
 *   <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} />
 */
export function useRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);
  return { refreshing, onRefresh };
}
