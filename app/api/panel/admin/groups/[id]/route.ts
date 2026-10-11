import { z } from "zod";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { GROUP_TABS } from "@/lib/mobile-contracts/admin-education";
import { toMobileGroup360 } from "@/lib/mobile/admin-education-views";
import { adminJson, requireAdminApi } from "@/lib/panel/admin-api";
import { loadGroup360Bundle } from "@/lib/panel/group-360-server";

const querySchema = z.object({ sekme: z.enum(GROUP_TABS).optional() });

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const params = idParamsSchema.safeParse(await context.params);
  const query = querySchema.safeParse({ sekme: new URL(request.url).searchParams.get("sekme") ?? undefined });
  if (!params.success || !query.success) return invalidApiInput();
  const bundle = await loadGroup360Bundle({ groupId: params.data.id, tabRaw: query.data.sekme, missing: "null" });
  if (!bundle) return adminJson({ error: "Grup bulunamadı.", code: "NOT_FOUND" }, { status: 404 });
  return adminJson(toMobileGroup360(bundle));
}
