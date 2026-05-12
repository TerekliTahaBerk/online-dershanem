import { QueryClient } from "@tanstack/react-query";

/** Tek query client örneği — RootProvider tarafından kullanılır. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, err) => {
        const code = (err as { status?: number } | undefined)?.status ?? 0;
        if (code >= 400 && code < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: { retry: 0 },
  },
});
