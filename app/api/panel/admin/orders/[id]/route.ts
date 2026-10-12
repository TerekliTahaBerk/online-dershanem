import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { adminJson, requireAdminApi } from "@/lib/panel/admin-api";
import { adminOrderProjection } from "@/lib/panel/admin-orders-projection";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(); if (!auth.ok) return auth.response;
  const params = idParamsSchema.safeParse(await context.params); if (!params.success) return invalidApiInput();
  const data = await adminOrderProjection(params.data.id);
  return data ? adminJson(data) : adminJson({ error: "Sipariş bulunamadı.", code: "NOT_FOUND" }, { status: 404 });
}
