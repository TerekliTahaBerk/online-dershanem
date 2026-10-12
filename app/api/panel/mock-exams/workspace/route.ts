import { prisma } from '@/lib/prisma';
import { requireApiAnyProductRole } from '@/lib/auth/api-guards';
import { getPanelFeatureFlags } from '@/lib/panel-feature-flags';
import { mockExamViewInclude } from '@/lib/mock-exam-view';
import { toMobileMockExams } from '@/lib/mobile/admin-rollout-views';
import { staffFeatureDisabled, staffJson } from '@/lib/panel/staff-api';

/** Rich editor projection for the authenticated learner only; no supplied student ID. */
export async function GET() {
  const auth = await requireApiAnyProductRole(['OD', 'OK'], 'STUDENT');
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().mockExamAnalysis) return staffFeatureDisabled('Deneme analizi henüz açık değil.');
  const student = await prisma.studentProfile.findUnique({
    where: { userId: auth.session.userId }, include: { user: { select: { fullName: true, email: true } } },
  });
  const exams = student ? await prisma.mockExam.findMany({ where: { studentId: student.id }, orderBy: { takenAt: 'desc' }, take: 100, include: mockExamViewInclude }) : [];
  const projection = toMobileMockExams({ students: student ? [student] : [], exams }, student?.id ?? null);
  // Students can revise reasons; approving nextAction remains staff-only.
  return staffJson({ ...projection, approval: null });
}
