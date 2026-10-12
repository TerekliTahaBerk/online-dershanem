import { z } from "zod";
import { adminJson, requireAdminApi } from "@/lib/panel/admin-api";
import { EDITOR_KINDS } from "@/lib/mobile-contracts/admin-education-editor";
import { loadEducationEditor } from "@/lib/panel/education-editor-server";
import { GroupMutationError } from "@/lib/panel/group-mutation-core";

const schema = z.object({ kind: z.enum(EDITOR_KINDS), id: z.string().regex(/^[\w-]{1,191}$/).optional(), group: z.string().regex(/^[\w-]{1,191}$/).optional(), teacher: z.string().regex(/^[\w-]{1,191}$/).optional(), q: z.string().trim().max(120).optional(), page: z.coerce.number().int().min(0).max(10000).default(0), week: z.coerce.number().int().min(-520).max(520).default(0) }).strict();
export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return adminJson({ error: "Geçersiz eğitim filtresi." }, { status: 400 });
  try { return adminJson(await loadEducationEditor(parsed.data)); }
  catch (error) { if (error instanceof GroupMutationError) return adminJson({ error: error.message, code: error.code }, { status: error.status }); throw error; }
}
