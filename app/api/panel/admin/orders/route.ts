import { z } from "zod";
import { invalidApiInput } from "@/lib/api/input-validation";
import { adminJson, requireAdminApi } from "@/lib/panel/admin-api";
import { adminOrdersProjection } from "@/lib/panel/admin-orders-projection";
const querySchema = z.object({ filtre: z.enum(["", "sorun", "ay"]).optional(), sayfa: z.string().regex(/^[1-9][0-9]{0,5}$/).optional(), q: z.string().max(80).optional() });
export async function GET(request: Request) {
  const auth = await requireAdminApi(); if (!auth.ok) return auth.response;
  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return invalidApiInput();
  return adminJson(await adminOrdersProjection(query.data));
}
