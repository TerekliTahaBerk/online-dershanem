import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color } from '@/design/tokens';
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
import TeacherLessonsScreen from '@/features/staff/teacher/teacher-lessons';
import type { NativeScreen, NativeScreenKey } from '@/navigation/native-screens';

import { PlaceholderScreen } from './placeholder-screen';

/**
 * Native ekranlar yalnız ait oldukları çalışma alanında, sunucu menüsü onları
 * içerdiğinde açılır. OD ekranları M2'de, Yön ekranları ve ortak check-in
 * M3'te, Deneme Ligi M4'te, veli ekranları M6'da, öğretmen / koç ekranları
 * M7'de yeni mimariye taşındı.
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
  'teacher-lessons': () => <TeacherLessonsScreen />,
  'teacher-assignments': () => <TeacherAssignmentsScreen />,
  'teacher-help': () => <TeacherHelpScreen />,
  'coach-home': () => <CoachHomeScreen />,
  'coach-students': () => <CoachStudentsScreen />,
  'coach-sessions': () => <CoachSessionsScreen />,
  'coach-plans': () => <CoachPlansScreen />,
  'teacher-odk-reports': () => <TeacherOdkReportsScreen />,
};

export function NativeScreenView({ screen, context }: { screen: NativeScreen; context: 'tab' | 'stack' }) {
  const insets = useSafeAreaInsets();
  if (screen.key === 'placeholder') {
    return (
      <View style={[styles.flex, context === 'tab' && { paddingTop: insets.top }]}>
        <PlaceholderScreen screen={screen} />
      </View>
    );
  }
  const content = SCREENS[screen.key]();
  // Sekmede başlık çubuğu yok: ekranlar (`Screen`) üst güvenli alanı kendisi
  // bırakmaz; yığında başlık çubuğu bırakır.
  if (context === 'tab') return <View style={[styles.flex, { paddingTop: insets.top }]}>{content}</View>;
  return content;
}

const styles = StyleSheet.create({ flex: { flex: 1, backgroundColor: color.canvas } });
