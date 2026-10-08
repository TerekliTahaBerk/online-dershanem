import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color } from '@/design/tokens';
import OdAssignmentsScreen from '@/features/od/od-assignments';
import OdHomeScreen from '@/features/od/od-home';
import OdLessonsScreen from '@/features/od/od-lessons';
import OdMaterialsScreen from '@/features/od/od-materials';
import OdProgressScreen from '@/features/od/od-progress';
import OkGoalsScreen from '@/features/ok/ok-goals';
import ExternalMockExamsScreen from '@/features/shared/external-mock-exams';
import type { NativeScreen, NativeScreenKey } from '@/navigation/native-screens';

import { PlaceholderScreen } from './placeholder-screen';

/**
 * M1'de korunan ekranlar (M2–M4'te yeniden yazılacak) yalnız ait oldukları
 * çalışma alanında, sunucu menüsü onları içerdiğinde açılır.
 */
const SCREENS: Record<Exclude<NativeScreenKey, 'placeholder'>, () => ReactElement> = {
  'od-home': () => <OdHomeScreen />,
  'od-lessons': () => <OdLessonsScreen />,
  'od-assignments': () => <OdAssignmentsScreen />,
  'od-materials': () => <OdMaterialsScreen />,
  'od-progress': () => <OdProgressScreen />,
  'external-mock-exams': () => <ExternalMockExamsScreen />,
  'ok-goals': () => <OkGoalsScreen />,
};

/** Eskiden yığın (başlıklı) ekran olan ve üst güvenli alanı kendisi bırakmayanlar. */
const NEEDS_TOP_INSET_IN_TAB: ReadonlySet<NativeScreenKey> = new Set(['od-materials', 'od-progress', 'external-mock-exams', 'ok-goals']);

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
  if (context === 'tab' && NEEDS_TOP_INSET_IN_TAB.has(screen.key)) {
    return <View style={[styles.flex, { paddingTop: insets.top }]}>{content}</View>;
  }
  return content;
}

const styles = StyleSheet.create({ flex: { flex: 1, backgroundColor: color.canvas } });
