import { z } from "zod";
import { adminJson, requireAdminApi } from "@/lib/panel/admin-api";
import { adminCoachingSessionProjection } from "@/lib/panel/admin-coaching-projection";
const schema = z.object({ id: z.string().min(1).max(191) });
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await context.params);
  if (!parsed.success) return adminJson({ error: "Görüşme kimliği geçersiz." }, { status: 400 });
  const data = await adminCoachingSessionProjection(parsed.data.id);
  return data ? adminJson(data) : adminJson({ error: "Görüşme bulunamadı." }, { status: 404 });
}
