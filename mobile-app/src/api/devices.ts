import { apiClient } from "./client";
import { endpoints } from "./endpoints";

export interface DeviceRegistration {
  expoPushToken: string;
  platform: "ios" | "android" | "web";
  appVersion: string;
  deviceModel?: string;
  osVersion?: string;
  locale?: string;
  timezone?: string;
}

export const devicesApi = {
  register: (payload: DeviceRegistration) =>
    apiClient.post<{ ok: true; deviceId: string }>(endpoints.devices, payload),
  unregister: (deviceId: string) =>
    apiClient.delete<{ ok: true }>(endpoints.device(deviceId)),
};
