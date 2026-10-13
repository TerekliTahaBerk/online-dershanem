import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Yerel açılış ekranıyla (app.json `expo-splash-screen`) aynı renk. */
export const LAUNCH_BACKGROUND = '#448971';

const BACKGROUND = require('../../assets/images/launch-background.jpg');

/**
 * Oturum açılışı (bootstrap) sürerken gösterilen yükleme ekranı. Görselde logo
 * dikey ortadadır; `cover` her ekran oranında logoyu ortada tutar. Yerel
 * açılış ekranı bu görsel çizilince kapatılır (`onReady`).
 */
export function LaunchScreen({ onReady }: { onReady?: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const reported = useRef(false);
  const ready = useCallback(() => {
    if (!reported.current) { reported.current = true; onReady?.(); }
  }, [onReady]);
  return <View style={styles.root} testID="launch-screen" accessible accessibilityRole="progressbar" accessibilityLabel="Uygulaman hazırlanıyor">
    <StatusBar style="light" />
    {imageFailed ? <Image source={require('../../assets/images/launch-logo.png')} contentFit="contain" style={styles.fallbackLogo} onDisplay={ready} onError={ready} accessibilityIgnoresInvertColors alt="" /> : <Image source={BACKGROUND} contentFit="cover" style={StyleSheet.absoluteFill} onDisplay={ready} onError={() => setImageFailed(true)} accessibilityIgnoresInvertColors alt="" />}
    <SafeAreaView edges={['bottom']} style={styles.footer}>
      <View style={styles.status}><ActivityIndicator size="small" color="#ffffff" /><Text style={styles.label}>Senin için hazırlanıyor</Text></View>
    </SafeAreaView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: LAUNCH_BACKGROUND },
  fallbackLogo: { position: 'absolute', alignSelf: 'center', top: '35%', width: 210, height: 210 },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 24, alignItems: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 24, backgroundColor: 'rgba(0, 35, 23, 0.24)' },
  label: { color: '#ffffff', fontSize: 13, fontWeight: '500', flexShrink: 1 },
});
