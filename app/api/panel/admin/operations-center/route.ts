import { z } from "zod";
import { toMobileOperationsCenter } from "@/lib/mobile/admin-views";
import { adminJson, requireAdminApi } from "@/lib/panel/admin-api";
import { getAdminOperationsCenterSnapshot } from "@/lib/panel/admin-operations-center-server";
import { parseOpsGroupFilter } from "@/lib/panel/admin-operations-center";

const querySchema = z.object({ grup: z.string().trim().max(20).optional() });

/**
 * Yönetim Operasyon Merkezi (mobil) — web `app/panel/yonetim` ile AYNI
 * `getAdminOperationsCenterSnapshot` ve `?grup=` süzgeci (bilinmeyen değer
 * "tumu"). Salt okuma. Kapı: gerçek ADMIN oturumu (`requireAdminApi`).
 */
export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const query = querySchema.safeParse({ grup: new URL(request.url).searchParams.get("grup") ?? undefined });
  const group = parseOpsGroupFilter(query.success ? query.data.grup : undefined);
  const snapshot = await getAdminOperationsCenterSnapshot();
  return adminJson(toMobileOperationsCenter(snapshot, group));
}
