import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { DelightIcon } from './delight-icon';
import { Text } from './primitives/text';
import { useDesign } from './theme';
import { color } from './tokens';

export function LearningProgress({ done, total, label }: { done: number; total: number; label: string }) {
  const { product, reduceMotion } = useDesign();
  const ratio = total > 0 ? Math.max(0, Math.min(1, done / total)) : 0;
  const progress = useRef(new Animated.Value(ratio)).current;
  useEffect(() => {
    if (reduceMotion) { progress.stopAnimation(); progress.setValue(ratio); return; }
    const animation = Animated.timing(progress, { toValue: ratio, duration: 280, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [progress, ratio, reduceMotion]);
  return <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100), text: `${done}/${total} görev` }} style={styles.track}>
    <Animated.View style={[styles.fill, { backgroundColor: product.accent, transform: [{ scaleX: progress }] }]} />
  </View>;
}

/** An earned state, never inferred from an empty or unavailable plan. */
export function DayComplete() {
  const { product } = useDesign();
  return <View style={[styles.complete, { backgroundColor: product.accentSoft }]} testID="day-complete">
    <DelightIcon name="spark" size={32} color={product.accent} />
    <View style={styles.copy}><Text variant="sectionTitle">Bugünkü planın tamamlandı!</Text><Text tone="secondary" variant="secondary">Emeğine sağlık. Şimdi kendine küçük bir mola verebilirsin.</Text></View>
  </View>;
}
const styles = StyleSheet.create({
  track: { height: 6, backgroundColor: color.border, borderRadius: 3, overflow: 'hidden', marginVertical: 8 },
  fill: { height: '100%', width: '100%', borderRadius: 3, transformOrigin: 'left center' },
  complete: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16 },
  copy: { flex: 1, gap: 4 },
});
