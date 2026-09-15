/**
 * GET /api/version — çalışan artefaktın kimliği.
 *
 * Auth yok: burada yalnızca zaten `x-build-*` yanıt başlıklarında görünen
 * bilgiler var. Amaç, production'ın `main`'in ucuyla aynı commit'te olup
 * olmadığını herkesin tek çağrıyla doğrulayabilmesi
 * (`scripts/check-production-version.mjs` bu uçtan okur).
 */
import { NextResponse } from "next/server";
import { buildInfo, formatBuildStamp } from "@/lib/build-info";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { ...buildInfo, stamp: formatBuildStamp(buildInfo), now: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
