import { z } from "zod";
import { invalidApiInput } from "@/lib/api/input-validation";
import { adminJson, requireAdminApi } from "@/lib/panel/admin-api";
import { loadAdminAnalytics } from "@/lib/panel/admin-system-server";
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();
const schema = z.object({ from: date, to: date, examType: z.enum(["ALL", "LGS", "TYT", "AYT", "YDT"]).optional(), product: z.enum(["ALL", "OD", "OK", "ODK"]).optional(), classLevel: z.string().max(32).optional(), groupId: z.string().max(80).optional(), teacherId: z.string().max(80).optional() }).strict();
export async function GET(request: Request) {
  const auth = await requireAdminApi(); if (!auth.ok) return auth.response;
  const input = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!input.success) return invalidApiInput();
  return adminJson(await loadAdminAnalytics(input.data));
}
