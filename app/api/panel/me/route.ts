import { NextResponse } from "next/server";
import { requireApiSessionBeforeGates } from "@/lib/auth/api-guards";
import { evaluateClientVersion } from "@/lib/auth/client-transport";
import { buildMobileBootstrap } from "@/lib/mobile/bootstrap-server";

/**
 * Mobil oturum önyükleme (bootstrap) — sözleşme:
 * `lib/mobile-contracts/bootstrap.ts`, docs/mobile/m1-api-contracts.md.
 *
 * Parola değişikliği / MFA bekleyen oturumda da çalışır ki istemci doğru
 * kapıyı gösterebilsin; o durumda yanıt YALNIZ kimlik + kapı bilgisidir
 * (`projectBootstrap`). Bu uç salt okumadır; hiçbir yazma yapmaz (oturumun
 * `lastSeenAt` güncellemesi dışında — her kimlikli istekte olduğu gibi).
 */
export async function GET(request: Request) {
  const version = evaluateClientVersion(request.headers, process.env.MOBILE_MIN_SUPPORTED_VERSION);
  if (!version.ok) {
    return NextResponse.json(
      { error: "Uygulamanın bu sürümü artık desteklenmiyor. Lütfen güncelleyin.", code: version.code, minSupportedVersion: version.minSupportedVersion },
      { status: 426, headers: { "Cache-Control": "no-store" } },
    );
  }

  const auth = await requireApiSessionBeforeGates();
  if (!auth.ok) return auth.response;

  const body = await buildMobileBootstrap(auth.session, { minSupportedVersion: version.minSupportedVersion });
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store, private" } });
}
