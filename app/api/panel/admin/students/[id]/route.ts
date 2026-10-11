import { NextResponse } from "next/server";
import { z } from "zod";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { prisma } from "@/lib/prisma";
import { toMobileStudent360 } from "@/lib/mobile/student-360-views";
import { adminJson, PRIVATE_NO_STORE, requireAdminApi } from "@/lib/panel/admin-api";
import { loadStudent360Bundle } from "@/lib/panel/student-360/index";

const querySchema = z.object({ sekme: z.string().trim().max(30).optional(), gorunum: z.string().trim().max(30).optional() });

/**
 * Öğrenci 360 (mobil, Faz 2.2) — web `app/panel/yonetim/ogrenciler/[id]` ile
 * AYNI `loadStudent360Bundle` (yönetici erişimi, `?sekme` / `?gorunum`
 * kuralları, yalnız açık bölümün sorguları). Bulunmayan öğrenci JSON 404
 * (sayfadaki `notFound()` yerine).
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const exists = await prisma.studentProfile.findUnique({ where: { id: params.data.id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Öğrenci bulunamadı.", code: "NOT_FOUND" }, { status: 404, headers: PRIVATE_NO_STORE });
  const url = new URL(request.url);
  const query = querySchema.safeParse({ sekme: url.searchParams.get("sekme") ?? undefined, gorunum: url.searchParams.get("gorunum") ?? undefined });
  const bundle = await loadStudent360Bundle({
    viewer: { userId: auth.session.userId, role: auth.session.role },
    studentProfileId: params.data.id,
    tabRaw: query.success ? query.data.sekme : undefined,
    viewRaw: query.success ? query.data.gorunum : undefined,
  });
  return adminJson(toMobileStudent360(bundle));
}
