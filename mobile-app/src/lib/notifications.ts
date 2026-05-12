/**
 * Push notification setup — Expo Notifications.
 *
 * - İzin ister, Expo push token alır.
 * - Token'ı backend'e (`/devices`) kaydeder.
 * - Foreground handler bildirim banner'ını gösterir.
 * - Tıklamada deep-link (`notification.request.content.data.href`) router'a iletilir.
 */
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { devicesApi } from "@/api/devices";
import { logger } from "@/lib/logger";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    logger.info("Push: emulator/simulator detected, skipping.");
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    logger.warn("Push: permission not granted");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#7C5CFF",
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  const token = (
    await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
  ).data;

  try {
    await devicesApi.register({
      expoPushToken: token,
      platform: Platform.OS as "ios" | "android",
      appVersion: Constants.expoConfig?.version ?? "0.0.0",
      deviceModel: Device.modelName ?? undefined,
      osVersion: Device.osVersion ?? undefined,
    });
  } catch (err) {
    logger.warn("device register failed", err);
  }

  return token;
}

export function addNotificationResponseListener(
  handler: (href: string | null) => void,
) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const href = (response.notification.request.content.data as { href?: string })?.href ?? null;
    handler(href);
  });
}
