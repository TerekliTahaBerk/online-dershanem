import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAccountRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { EXPO_PUSH_TOKEN } from "@/lib/push/expo-client";
import { listPushDevices, registerPushDevice, revokePushDevices } from "@/lib/push/device-server";
import { pushRoleAllowed } from "@/lib/push/classification";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";

/**
 * Mobil push cihaz kaydı (M5).
 *  - Kimlik: etkin oturum + tamamlanmış parola / MFA kapıları
 *    (`requireApiAccountRole`). Öğrenci ve veli her zaman; öğretmen ve
 *    yönetici yalnız `staffPush` bayrağı açıkken (P5.4). Kayıt silme
 *    (DELETE) personel için bayraktan bağımsız açıktır (temizlik).
 *  - Kullanıcı ve oturum OTURUMDAN çözülür; gövdede kullanıcı / oturum
 *    kimliği kabul edilmez (`strict`).
 *  - `x-od-client: mobile` yalnız istemci türünü belirtir; KİMLİK KANITI DEĞİLDİR.
 */
const registerSchema = z.object({
  token: z.string().regex(EXPO_PUSH_TOKEN),
  platform: z.enum(["IOS", "ANDROID"]),
  appVersion: z.string().regex(/^\d{1,3}\.\d{1,3}\.\d{1,3}$/),
  projectId: z.string().uuid().nullable().optional(),
  appEnvironment: z.enum(["development", "preview", "production"]).nullable().optional(),
  permissionStatus: z.enum(["granted", "provisional", "ephemeral"]).nullable().optional(),
}).strict();

const unregisterSchema = z.object({ token: z.string().regex(EXPO_PUSH_TOKEN).optional() }).strict();

function mobileClient(request: Request) {
  return request.headers.get("x-od-client") === "mobile";
}

/** Personel push kapalıyken öğretmen / yönetici için 404 (özellik yok). */
async function requirePushAccount(options: { allowStaffWhenDisabled?: boolean } = {}) {
  const auth = await requireApiAccountRole("STUDENT", "PARENT", "TEACHER", "ADMIN");
  if (!auth.ok) return auth;
  if (!options.allowStaffWhenDisabled && !pushRoleAllowed(auth.session.role, getPanelFeatureFlags().staffPush)) {
    return { ok: false as const, response: NextResponse.json({ error: "Telefon bildirimleri bu hesap için açık değil.", code: "FEATURE_DISABLED" }, { status: 404 }) };
  }
  return auth;
}

async function guard(request: Request, userId: string, action: string) {
  return guardMutation({ action, requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:push-devices:${userId}`, rateLimit: { max: 30, windowMs: 15 * 60 * 1000 } });
}

export async function GET() {
  const auth = await requirePushAccount();
  if (!auth.ok) return auth.response;
  const devices = await listPushDevices(auth.session.userId, auth.session.sessionId);
  return NextResponse.json({ devices }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const auth = await requirePushAccount();
  if (!auth.ok) return auth.response;
  if (!mobileClient(request)) return NextResponse.json({ error: "Cihaz kaydı yalnız mobil uygulamadan yapılır." }, { status: 400 });
  const checked = await guard(request, auth.session.userId, "panel.push_devices.register");
  if (!checked.ok) return NextResponse.json({ error: checked.message }, { status: checked.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Cihaz bilgisi geçerli görünmüyor." }, { status: 400 });
  const device = await registerPushDevice({
    userId: auth.session.userId,
    sessionId: auth.session.sessionId,
    token: parsed.data.token,
    platform: parsed.data.platform,
    appVersion: parsed.data.appVersion,
    projectId: parsed.data.projectId ?? null,
    appEnvironment: parsed.data.appEnvironment ?? null,
    permissionStatus: parsed.data.permissionStatus ?? null,
  });
  // Token geri döndürülmez.
  return NextResponse.json({ registered: true, deviceId: device.id }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(request: Request) {
  const auth = await requirePushAccount({ allowStaffWhenDisabled: true });
  if (!auth.ok) return auth.response;
  const checked = await guard(request, auth.session.userId, "panel.push_devices.unregister");
  if (!checked.ok) return NextResponse.json({ error: checked.message }, { status: checked.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = unregisterSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Cihaz bilgisi geçerli görünmüyor." }, { status: 400 });
  const revoked = await revokePushDevices({ userId: auth.session.userId, sessionId: auth.session.sessionId, token: parsed.data.token ?? null, reason: "USER_UNREGISTERED" });
  return NextResponse.json({ revoked }, { headers: { "Cache-Control": "private, no-store" } });
}
