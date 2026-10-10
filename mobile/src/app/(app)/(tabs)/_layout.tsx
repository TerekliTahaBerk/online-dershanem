import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/design/primitives';
import { useDesign } from '@/design/theme';
import { color, radius, space, touchTarget } from '@/design/tokens';
import { NavIcon } from '@/features/shell/nav-icon';
import { PanelHeader } from '@/features/shell/panel-header';
import { useReadyBootstrap } from '@/lib/auth/session-provider';

const SLOTS = ['index', 'slot-1', 'slot-2', 'slot-3'] as const;

/** Web mobilePrimaryNav order, with consistent selected states on iOS/Android. */
export default function TabsLayout() {
  const bootstrap = useReadyBootstrap();
  const { product } = useDesign();
  const insets = useSafeAreaInsets();
  const learner = bootstrap.user.role === 'STUDENT' || bootstrap.user.role === 'PARENT';
  const primary = learner ? (bootstrap.workspace?.navigation.primary ?? []).slice(0, 4) : [];
  const items = [
    ...SLOTS.flatMap((name, index) => index === 0 || primary[index] ? [{ name, label: primary[index]?.label ?? 'Bugün', id: primary[index]?.id ?? 'today' }] : []),
    { name: 'menu', label: 'Menü', id: 'menu' },
  ];

  return <Tabs screenOptions={{ header: () => <PanelHeader />, sceneStyle: { backgroundColor: color.canvas } }} tabBar={({ state, navigation }) => (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space[2]), paddingLeft: Math.max(insets.left, space[2]), paddingRight: Math.max(insets.right, space[2]) }]} accessibilityRole="tablist">
      {items.map((item) => {
        const route = state.routes.find((candidate) => candidate.name === item.name);
        if (!route) return null;
        const selected = state.routes[state.index]?.key === route.key;
        const ink = selected ? product.accent : color.textSecondary;
        return <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={item.label}
          onPress={() => { const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (!selected && !event.defaultPrevented) navigation.navigate(route.name, route.params); }}
          onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
          testID={`nav-${item.id}`} style={({ pressed }) => [styles.tab, selected && { backgroundColor: product.accentSoft }, pressed && styles.pressed]}>
          <NavIcon id={item.id} color={ink} size={19} />
          <Text variant="caption" style={[styles.label, { color: ink }]}>{item.label}</Text>
        </Pressable>;
      })}
    </View>
  )}>
    {SLOTS.map((name, index) => <Tabs.Screen key={name} name={name} options={{ title: primary[index]?.label ?? 'Bugün', href: index > 0 && !primary[index] ? null : undefined }} />)}
    <Tabs.Screen name="menu" options={{ title: 'Menü' }} />
  </Tabs>;
}

const styles = StyleSheet.create({
  bar: { backgroundColor: color.canvas, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, flexDirection: 'row', paddingTop: space[2], gap: space[1] },
  tab: { flex: 1, minHeight: touchTarget + 8, paddingVertical: space[2], borderRadius: radius.control, alignItems: 'center', justifyContent: 'center', gap: space[1] },
  label: { fontSize: 11, lineHeight: 15, textAlign: 'center' },
  pressed: { backgroundColor: color.pressed },
});
