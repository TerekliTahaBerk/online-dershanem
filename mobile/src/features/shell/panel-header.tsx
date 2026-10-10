import { useRouter } from 'expo-router';
import { Bell, Settings } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/design/primitives';
import { color, space, touchTarget } from '@/design/tokens';
import { useReadyBootstrap } from '@/lib/auth/session-provider';

import { WorkspaceSwitcher } from './workspace-switcher';

/** One shared header for every role/product tab, matching the web shell. */
export function PanelHeader() {
  const router = useRouter();
  const bootstrap = useReadyBootstrap();
  const unread = bootstrap.workspace?.unreadNotifications ?? 0;
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.surface}>
    <View style={styles.bar}>
      <View style={styles.workspace}><WorkspaceSwitcher compact /></View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Bildirimler${unread ? `, ${unread} okunmamış` : ''}`} onPress={() => router.push('/notifications')} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
        <Bell size={20} color={color.textSecondary} strokeWidth={1.7} />
        {unread > 0 ? <View style={styles.badge}><Text variant="caption" tone="inverse">{unread > 99 ? '99+' : unread}</Text></View> : null}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Hesap ve ayarlar" onPress={() => router.push('/account')} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
        <Settings size={20} color={color.textSecondary} strokeWidth={1.7} />
      </Pressable>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  surface: { backgroundColor: color.canvas, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  bar: { minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[3], gap: space[1], paddingVertical: space[1] },
  workspace: { flex: 1, minWidth: 0 },
  action: { minWidth: touchTarget, minHeight: touchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  pressed: { backgroundColor: color.pressed },
  badge: { position: 'absolute', right: 0, top: 0, minWidth: 18, paddingHorizontal: 4, backgroundColor: color.primary, borderRadius: 9 },
});
