import { z } from "zod";
import { invalidApiInput } from "@/lib/api/input-validation";
import { adminJson, requireAdminApi } from "@/lib/panel/admin-api";
import { loadAdminAudit } from "@/lib/panel/admin-system-server";
const schema = z.object({ tur: z.enum(["", "User", "Group", "Lesson", "ParentStudent", "LeadSubmission", "OdOrder"]).optional() }).strict();
export async function GET(request: Request) {
  const auth = await requireAdminApi(); if (!auth.ok) return auth.response;
  const input = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!input.success) return invalidApiInput();
  return adminJson(await loadAdminAudit(input.data.tur));
}
