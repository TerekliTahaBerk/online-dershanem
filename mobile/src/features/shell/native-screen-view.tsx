import { MockExamsScreen, PilotScreen } from '@/features/admin/rollout';
import { AdminAnalyticsScreen, AdminAuditScreen, AdminFeaturesScreen, AdminQualityScreen } from '@/features/admin/system';
import AdminOrdersScreen from '@/features/admin/orders';
import AdminCoachingScreen from '@/features/admin/coaching';
import type { ReactElement } from 'react';
import ActivationDeskScreen from '@/features/admin/activation-desk';
import InterventionsScreen from '@/features/admin/interventions';
import OperationsCenterScreen from '@/features/admin/operations-center';
import PeopleScreen from '@/features/admin/people';
import AdminReportsScreen from '@/features/admin/reports';
import SignupsScreen from '@/features/admin/signups';
import EducationScreen from '@/features/admin/education';
import EducationEditorScreen from '@/features/admin/education-editor';
import OdkExamsScreen from '@/features/odk/odk-exams';
import OdkHomeScreen from '@/features/odk/odk-home';
import OdkSwitchScreen from '@/features/odk/odk-switch';
import OdAssignmentsScreen from '@/features/od/od-assignments';
import OdHomeScreen from '@/features/od/od-home';
import OdLessonsScreen from '@/features/od/od-lessons';
import OdMaterialsScreen from '@/features/od/od-materials';
import OdProgressScreen from '@/features/od/od-progress';
import OdReviewRecoveryScreen from '@/features/od/od-review-recovery';
import OdWeeklyDigestScreen from '@/features/od/od-weekly-digest';
import CheckInScreen from '@/features/shared/check-in';
import ExternalMockExamsScreen from '@/features/shared/external-mock-exams';
import YonCoachingScreen from '@/features/yon/yon-coaching';
import YonGoalsScreen from '@/features/yon/yon-goals';
import YonPlanScreen from '@/features/yon/yon-plan';
import YonTodayScreen from '@/features/yon/yon-today';
import YonWeeklyScreen from '@/features/yon/yon-weekly';
import YonWorkScreen from '@/features/yon/yon-work';
import ParentAccountScreen from '@/features/parent/parent-account';
import ParentAssignmentsScreen from '@/features/parent/parent-assignments';
import ParentCoachingScreen from '@/features/parent/parent-coaching';
import ParentExternalExamsScreen from '@/features/parent/parent-external-exams';
import ParentHomeScreen from '@/features/parent/parent-home';
import ParentInsightsScreen from '@/features/parent/parent-insights';
import ParentLessonsScreen from '@/features/parent/parent-lessons';
import ParentOdkReportsScreen from '@/features/parent/parent-odk-reports';
import ParentTeachersScreen from '@/features/parent/parent-teachers';
import ParentWeeklyScreen from '@/features/parent/parent-weekly';
import CoachHomeScreen from '@/features/staff/coach/coach-home';
import CoachPlansScreen from '@/features/staff/coach/coach-plans';
import CoachSessionsScreen from '@/features/staff/coach/coach-sessions';
import CoachStudentsScreen from '@/features/staff/coach/coach-students';
import TeacherOdkReportsScreen from '@/features/staff/odk/teacher-odk-reports';
import TeacherAssignmentsScreen from '@/features/staff/teacher/teacher-assignments';
import TeacherHelpScreen from '@/features/staff/teacher/teacher-help';
import TeacherHomeScreen from '@/features/staff/teacher/teacher-home';
import TeacherStudentsScreen from '@/features/staff/teacher/teacher-students';
import TeacherMaterialsScreen from '@/features/staff/teacher/teacher-materials';
import OdkManagementExamsScreen from '../staff/odk/management-exams';
import OdkManagementResultsScreen from '../staff/odk/management-results';
import OdkManagementReportsScreen from '../staff/odk/management-reports';
import OdkManagementPilotScreen from '../staff/odk/management-pilot';
import OdkManagementHomeScreen from '../staff/odk/management-home';
import OdkManagementPackagesScreen from '../staff/odk/management-packages';
import TeacherAiDraftsScreen from '../staff/teacher/teacher-ai-drafts';
import TeacherDigestsScreen from '../staff/teacher/teacher-digests';
import TeacherInterventionsScreen from '../staff/teacher/teacher-interventions';
import TeacherRecoveryScreen from '../staff/teacher/teacher-recovery';
import TeacherReviewScreen from '../staff/teacher/teacher-review';
import TeacherAnalysisScreen from '../staff/teacher/teacher-analysis';
import TeacherMockExamsScreen from '@/features/staff/teacher/teacher-mock-exams';
import TeacherLessonsScreen from '@/features/staff/teacher/teacher-lessons';
import type { NativeScreen, NativeScreenKey } from '@/navigation/native-screens';

import { PlaceholderScreen } from './placeholder-screen';

/**
 * Native ekranlar yalnız ait oldukları çalışma alanında, sunucu menüsü onları
 * içerdiğinde açılır. OD ekranları M2'de, Yön ekranları ve ortak check-in
 * M3'te, Deneme Ligi M4'te, veli ekranları M6'da, öğretmen / koç ekranları
 * M7'de, yönetim Operasyon Merkezi Faz 1'de yeni mimariye taşındı.
 */
const SCREENS: Record<Exclude<NativeScreenKey, 'placeholder'>, () => ReactElement> = {
  'od-home': () => <OdHomeScreen />,
  'od-lessons': () => <OdLessonsScreen />,
  'od-assignments': () => <OdAssignmentsScreen />,
  'od-materials': () => <OdMaterialsScreen />,
  'od-progress': () => <OdProgressScreen />,
  'od-review-recovery': () => <OdReviewRecoveryScreen />,
  'od-weekly-digest': () => <OdWeeklyDigestScreen />,
  'external-mock-exams': () => <ExternalMockExamsScreen />,
  'check-in': () => <CheckInScreen />,
  'yon-today': () => <YonTodayScreen />,
  'yon-work': () => <YonWorkScreen />,
  'yon-coaching': () => <YonCoachingScreen />,
  'yon-plan': () => <YonPlanScreen />,
  'yon-goals': () => <YonGoalsScreen />,
  'yon-weekly': () => <YonWeeklyScreen />,
  'odk-home': () => <OdkHomeScreen />,
  'odk-exams': () => <OdkExamsScreen />,
  'odk-switch': () => <OdkSwitchScreen />,
  'parent-home': () => <ParentHomeScreen />,
  'parent-lessons': () => <ParentLessonsScreen />,
  'parent-assignments': () => <ParentAssignmentsScreen />,
  'parent-teachers': () => <ParentTeachersScreen />,
  'parent-insights': () => <ParentInsightsScreen />,
  'parent-coaching': () => <ParentCoachingScreen />,
  'parent-odk-reports': () => <ParentOdkReportsScreen />,
  'parent-external-exams': () => <ParentExternalExamsScreen />,
  'parent-weekly': () => <ParentWeeklyScreen />,
  'parent-account': () => <ParentAccountScreen />,
  'teacher-home': () => <TeacherHomeScreen />,
  'teacher-students': () => <TeacherStudentsScreen />,
  'teacher-materials': () => <TeacherMaterialsScreen />,
  'odk-management-exams': () => <OdkManagementExamsScreen />,
  'odk-management-results': () => <OdkManagementResultsScreen />,
  'odk-management-reports': () => <OdkManagementReportsScreen />,
  'odk-management-pilot': () => <OdkManagementPilotScreen />,
  'odk-management-home': () => <OdkManagementHomeScreen />,
  'odk-management-packages': () => <OdkManagementPackagesScreen />,
  'teacher-ai-drafts': () => <TeacherAiDraftsScreen />,
  'teacher-digests': () => <TeacherDigestsScreen />,
  'teacher-interventions': () => <TeacherInterventionsScreen />,
  'teacher-recovery': () => <TeacherRecoveryScreen />,
  'teacher-review': () => <TeacherReviewScreen />,
  'teacher-analysis': () => <TeacherAnalysisScreen />,
  'teacher-mock-exams': () => <TeacherMockExamsScreen />,
  'teacher-lessons': () => <TeacherLessonsScreen />,
  'teacher-assignments': () => <TeacherAssignmentsScreen />,
  'teacher-help': () => <TeacherHelpScreen />,
  'coach-home': () => <CoachHomeScreen />,
  'coach-students': () => <CoachStudentsScreen />,
  'coach-sessions': () => <CoachSessionsScreen />,
  'coach-plans': () => <CoachPlansScreen />,
  'teacher-odk-reports': () => <TeacherOdkReportsScreen />,
  'admin-operations-center': () => <OperationsCenterScreen />,
  'admin-interventions': () => <InterventionsScreen />,
  'admin-reports': () => <AdminReportsScreen />,
  'admin-activation-desk': () => <ActivationDeskScreen />,
  'admin-people': () => <PeopleScreen />,
  'admin-signups': () => <SignupsScreen />,
  'admin-education': () => <EducationScreen />,
  'admin-calendar': () => <EducationEditorScreen kind="calendar" />,
  'admin-analytics': () => <AdminAnalyticsScreen />,
  'admin-audit': () => <AdminAuditScreen />,
  'admin-features': () => <AdminFeaturesScreen />,
  'admin-quality': () => <AdminQualityScreen />,
  'admin-pilot': () => <PilotScreen />,
  'admin-mock-exams': () => <MockExamsScreen />,
  'admin-orders': () => <AdminOrdersScreen />,
  'admin-coaching': () => <AdminCoachingScreen />,
  'admin-curriculum': () => <EducationEditorScreen kind="version" />,
};

/** Üst güvenli alanı sekmelerde PanelHeader, detaylarda Stack header bırakır. */
export function NativeScreenView({ screen }: { screen: NativeScreen; context: 'tab' | 'stack' }) {
  if (screen.key === 'placeholder') return <PlaceholderScreen screen={screen} />;
  return SCREENS[screen.key]();
}
