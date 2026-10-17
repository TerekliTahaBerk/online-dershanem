import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DelightIcon } from './delight-icon';
import { MotionPressable } from './motion';
import { Text } from './primitives/text';
import { useDesign } from './theme';
import { color, tone } from './tokens';

export type Celebration = { key: string; kind: 'task' | 'submission' };
const CelebrationContext = createContext<(event: Celebration) => void>(() => undefined);
export const useCelebration = () => useContext(CelebrationContext);
const COPY = {
  task: { title: 'Bir adım daha ileri! 🎉', body: 'Çalışmanı tamamladın. Emeğine sağlık, seninle gurur duyuyoruz!' },
  submission: { title: 'Emeğin yola çıktı! 🚀', body: 'Gönderimin öğretmenine ulaştı. Harika iş çıkardın!' },
};

/** Only confirmed student actions trigger this; no rewards from initial data/refetches. */
export function CelebrationProvider({ children, enabled = true }: PropsWithChildren<{ enabled?: boolean }>) {
  const [event, setEvent] = useState<Celebration | null>(null);
  const dismiss = useCallback(() => setEvent(null), []);
  const seen = useRef(new Set<string>());
  const celebrate = useCallback((next: Celebration) => {
    if (!enabled || (AppState.currentState && AppState.currentState !== 'active') || seen.current.has(next.key)) return;
    seen.current.add(next.key);
    if (seen.current.size > 128) seen.current.delete(seen.current.values().next().value!);
    setEvent(next);
  }, [enabled]);
  useEffect(() => { if (!enabled) setEvent(null); }, [enabled]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => { if (state !== 'active') setEvent(null); });
    return () => sub.remove();
  }, []);
  return <CelebrationContext.Provider value={celebrate}>
    <View style={styles.root}>{children}{enabled && event ? <CelebrationOverlay key={event.key} event={event} onClose={dismiss} /> : null}</View>
  </CelebrationContext.Provider>;
}

function CelebrationOverlay({ event, onClose }: { event: Celebration; onClose: () => void }) {
  const { product, reduceMotion } = useDesign();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const copy = COPY[event.kind];
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${copy.title} ${copy.body}`);
    const timer = setTimeout(onClose, 4500);
    return () => clearTimeout(timer);
  }, [copy, onClose]);
  useEffect(() => {
    if (reduceMotion) { progress.stopAnimation(); progress.setValue(1); return; }
    if (Platform.OS === 'ios' || Platform.OS === 'android') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    const animation = Animated.timing(progress, { toValue: 1, duration: 1700, easing: Easing.out(Easing.quad), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion]);
  return <View pointerEvents="box-none" style={styles.overlay} testID="celebration">
    {!reduceMotion && event.kind === 'task' ? <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID="celebration-confetti">
      {Array.from({ length: 24 }, (_, index) => {
        const endX = ((index * 47) % 101) / 100 * width - width / 2;
        return <Animated.View key={index} style={[styles.particle, { left: width / 2, top: insets.top + 70, width: index % 3 === 0 ? 7 : 5, height: index % 3 === 0 ? 7 : 11, borderRadius: index % 3 === 0 ? 4 : 2, backgroundColor: [product.accent, tone.success.text, tone.warning.text, tone.info.text][index % 4], opacity: progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }), transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, endX] }) }, { translateY: progress.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, -35 - (index % 4) * 15, 200 + (index % 5) * 25] }) }, { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${index % 2 ? 260 : -260}deg`] }) }] }]} />;
      })}
    </View> : null}
    <View style={[styles.notice, { marginTop: insets.top + 12, borderColor: product.accentSoft }]}>
      <View style={[styles.mark, { backgroundColor: product.accentSoft }]}><DelightIcon name={event.kind === 'task' ? 'spark' : 'leaf'} color={product.accent} size={28} /></View>
      <View style={styles.copy}><Text variant="bodyStrong" maxFontSizeMultiplier={1.6}>{copy.title}</Text><Text variant="secondary" tone="secondary" maxFontSizeMultiplier={1.6}>{copy.body}</Text></View>
      <MotionPressable feedback={false} accessibilityRole="button" accessibilityLabel="Kutlamayı kapat" onPress={onClose} style={styles.close}><X size={18} color={color.textMuted} /></MotionPressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 },
  notice: { marginHorizontal: 16, backgroundColor: color.canvas, borderWidth: 1, borderRadius: 20, paddingLeft: 14, paddingVertical: 14, paddingRight: 4, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: color.text, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
  mark: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 3 },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  particle: { position: 'absolute' },
});
