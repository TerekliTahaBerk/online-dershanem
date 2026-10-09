import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color } from '@/design/tokens';
import OdAssignmentsScreen from '@/features/od/od-assignments';
import OdHomeScreen from '@/features/od/od-home';
import OdLessonsScreen from '@/features/od/od-lessons';
import OdMaterialsScreen from '@/features/od/od-materials';
import OdProgressScreen from '@/features/od/od-progress';
import OdReviewRecoveryScreen from '@/features/od/od-review-recovery';
import OdWeeklyDigestScreen from '@/features/od/od-weekly-digest';
import OkGoalsScreen from '@/features/ok/ok-goals';
import ExternalMockExamsScreen from '@/features/shared/external-mock-exams';
import type { NativeScreen, NativeScreenKey } from '@/navigation/native-screens';

import { PlaceholderScreen } from './placeholder-screen';

/**
 * Native ekranlar yalnız ait oldukları çalışma alanında, sunucu menüsü onları
 * içerdiğinde açılır. OD ekranları M2'de yeni mimariye taşındı; `ok-goals`
 * (Yön) M1'den korunan eski ekrandır (M3).
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
  'ok-goals': () => <OkGoalsScreen />,
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
