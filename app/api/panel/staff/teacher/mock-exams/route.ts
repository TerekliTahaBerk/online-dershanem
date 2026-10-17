import { z } from 'zod';
import { loadTeacherMockExams } from '@/lib/panel/teacher-mock-exams-server';
import { getPanelFeatureFlags } from '@/lib/panel-feature-flags';
import { toMobileMockExams } from '@/lib/mobile/admin-rollout-views';
import { requireStaffApi, staffJson, staffNotFound, staffFeatureDisabled, PRIVATE_NO_STORE } from '@/lib/panel/staff-api';

const schema = z.object({ ogrenci: z.string().regex(/^[\w-]{1,191}$/).optional() }).strict();
export async function GET(request: Request) {
  const auth = await requireStaffApi('OD', 'od:lesson:teach');
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().mockExamAnalysis) return staffFeatureDisabled('Deneme analizi şu an kullanıma kapalı, çok yakında açılacak.');
  const query = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return Response.json({ error: 'Geçersiz öğrenci seçimi.' }, { status: 400, headers: PRIVATE_NO_STORE });
  const data = await loadTeacherMockExams(auth.session.userId);
  if (query.data.ogrenci && !data.students.some((item) => item.id === query.data.ogrenci)) return staffNotFound('Öğrenciyi bulamadık.');
  return staffJson(toMobileMockExams(data, query.data.ogrenci ?? null));
}
