import { z } from 'zod';
import { loadEducationEditor } from '@/lib/panel/education-editor-server';
import { GroupMutationError } from '@/lib/panel/group-mutation-core';
import { requireStaffApi, staffJson, PRIVATE_NO_STORE } from '@/lib/panel/staff-api';

const id = z.string().regex(/^[\w-]{1,191}$/);
const schema = z.object({ kind: z.enum(['assignment', 'material']), id: id.optional(), group: id.optional(), lesson: id.optional(), q: z.string().trim().max(120).optional(), page: z.coerce.number().int().min(0).max(10000).default(0) }).strict();

export async function GET(request: Request) {
  const auth = await requireStaffApi('OD', 'od:lesson:teach');
  if (!auth.ok) return auth.response;
  const query = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return Response.json({ error: 'Geçersiz eğitim filtresi.' }, { status: 400, headers: PRIVATE_NO_STORE });
  try { return staffJson(await loadEducationEditor({ ...query.data, teacherScope: auth.session.userId })); }
  catch (error) {
    if (error instanceof GroupMutationError) return Response.json({ error: error.message, code: error.code }, { status: error.status, headers: PRIVATE_NO_STORE });
    throw error;
  }
}
