"use client";

import { QueryClient, QueryClientProvider, isServer } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import * as React from "react";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,           // 30s default
        gcTime: 5 * 60_000,          // 5 min
        refetchOnWindowFocus: false,
        retry: (failureCount, error: any) => {
          // Don't retry on FORBIDDEN/UNAUTHORIZED/VALIDATION
          const code = error?.code;
          if (code === "FORBIDDEN" || code === "UNAUTHORIZED" || code === "VALIDATION") return false;
          return failureCount < 2;
        }
      },
      mutations: {
        retry: 0
      }
    }
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (isServer) return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const client = getQueryClient();
  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />}
    </QueryClientProvider>
  );
}
