import { Image } from 'expo-image';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

/** Yerel açılış ekranıyla (app.json `expo-splash-screen`) aynı renk. */
export const LAUNCH_BACKGROUND = '#448971';

const BACKGROUND = require('../../assets/images/launch-background.jpg');

/**
 * Oturum açılışı (bootstrap) sürerken gösterilen yükleme ekranı. Görselde logo
 * dikey ortadadır; `cover` her ekran oranında logoyu ortada tutar. Yerel
 * açılış ekranı bu görsel çizilince kapatılır (`onReady`).
 */
export function LaunchScreen({ onReady }: { onReady?: () => void }) {
  return <View style={styles.root} accessible accessibilityRole="progressbar" accessibilityLabel="Yükleniyor">
    <Image source={BACKGROUND} contentFit="cover" style={StyleSheet.absoluteFill} onDisplay={onReady} onError={onReady} accessibilityIgnoresInvertColors alt="" />
    <ActivityIndicator style={styles.spinner} size="small" color="#ffffff" />
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: LAUNCH_BACKGROUND },
  spinner: { position: 'absolute', left: 0, right: 0, bottom: '18%' },
});
