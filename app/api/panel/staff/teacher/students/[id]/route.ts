import { z } from 'zod';
import { idParamsSchema, invalidApiInput } from '@/lib/api/input-validation';
import { toMobileStudent360 } from '@/lib/mobile/student-360-views';
import { requireStaffApi, staffJson } from '@/lib/panel/staff-api';
import { loadStudent360Bundle } from '@/lib/panel/student-360/index';

const querySchema = z.object({ sekme: z.string().trim().max(30).optional(), gorunum: z.string().trim().max(30).optional() });

/** Öğretmen rolüyle ortak yükleyici: ilişkisiz öğrenci 404, ticaret yüklenmez. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi('OD', 'od:student:read');
  if (!auth.ok) return auth.response;
  const params = idParamsSchema.safeParse(await context.params);
  const search = new URL(request.url).searchParams;
  const query = querySchema.safeParse({ sekme: search.get('sekme') ?? undefined, gorunum: search.get('gorunum') ?? undefined });
  if (!params.success || !query.success) return invalidApiInput();
  const bundle = await loadStudent360Bundle({
    viewer: { userId: auth.session.userId, role: 'TEACHER' }, studentProfileId: params.data.id,
    tabRaw: query.data.sekme, viewRaw: query.data.gorunum,
  });
  return staffJson(toMobileStudent360(bundle));
}
