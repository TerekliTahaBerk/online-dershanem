import { apiClient } from "./client";
import { endpoints } from "./endpoints";
import type { ApiResponse, NotificationItem } from "@/types/api";

export const notificationsApi = {
  list: () =>
    apiClient
      .get<ApiResponse<NotificationItem[]> & { meta?: { unread: number } }>(
        endpoints.notifications,
      )
      .then((r) => ({ items: r.data, unread: r.meta?.unread ?? 0 })),

  read: (id: string) => apiClient.post<{ ok: true }>(endpoints.notification(id)),

  readAll: () => apiClient.post<{ ok: true }>(endpoints.notificationsReadAll),
};
