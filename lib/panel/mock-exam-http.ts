import "server-only";

import { NextResponse } from "next/server";

/** Dış deneme uçlarının ortak taşıma yardımcıları (web + mobil). */
export const isBearerRequest = (request: Request) => /^Bearer\s+/i.test(request.headers.get("authorization") ?? "");

/** `requireApiRecentAdminStepUp` ile aynı yanıt (web "Kimliği doğrula" bağlantısını gösterir). */
export const stepUpRequired = () => NextResponse.json({ error: "Bu hassas işlem için kimliğinizi yeniden doğrulayın.", code: "STEP_UP_REQUIRED", redirect: "/panel/guvenlik" }, { status: 428 });
