import { NextResponse } from "next/server";
import { z } from "zod";
import type { MobilePlatform } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, requireMobileUser } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PlatformEnum = z.enum(["ios", "android", "web"]);

const Body = z.object({
  expoPushToken: z.string().min(10),
  platform: PlatformEnum,
  appVersion: z.string().min(1).max(20),
  deviceModel: z.string().max(120).optional(),
  osVersion: z.string().max(40).optional(),
  locale: z.string().max(20).optional(),
  timezone: z.string().max(60).optional(),
});

const PLATFORM_MAP: Record<z.infer<typeof PlatformEnum>, MobilePlatform> = {
  ios: "IOS",
  android: "ANDROID",
  web: "WEB",
};

/**
 * Cihaz / push token kayıt (upsert).
 * Aynı `expoPushToken` farklı kullanıcılarda olamaz — token o kullanıcıya
 * yeniden bağlanır (cihaz devri için güvenli).
 */
export async function POST(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError(400, "BAD_REQUEST", "Geçersiz JSON.");
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return jsonError(400, "VALIDATION", "Eksik/hatalı alanlar.");

  const data = parsed.data;
  const device = await prisma.mobileDevice.upsert({
    where: { expoPushToken: data.expoPushToken },
    create: {
      userId: auth.userId,
      expoPushToken: data.expoPushToken,
      platform: PLATFORM_MAP[data.platform],
      appVersion: data.appVersion,
      deviceModel: data.deviceModel,
      osVersion: data.osVersion,
      locale: data.locale,
      timezone: data.timezone,
    },
    update: {
      userId: auth.userId,
      platform: PLATFORM_MAP[data.platform],
      appVersion: data.appVersion,
      deviceModel: data.deviceModel,
      osVersion: data.osVersion,
      locale: data.locale,
      timezone: data.timezone,
      lastSeenAt: new Date(),
      revokedAt: null,
    },
    select: { id: true },
  });

  return NextResponse.json({ data: { ok: true, deviceId: device.id } });
}
