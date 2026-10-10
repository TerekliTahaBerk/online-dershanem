import { useEffect, useRef, type PropsWithChildren, type ReactNode } from 'react';
import { X } from 'lucide-react-native';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/lib/api/errors';

import { useDesign } from '../theme';
import { color, radius, space, tone as toneColor, type Tone } from '../tokens';
import { Button } from './controls';
import { Text } from './text';

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={styles.state} accessibilityRole="summary">
      <Text variant="sectionTitle">{title}</Text>
      {body ? <Text tone="secondary">{body}</Text> : null}
      {action}
    </View>
  );
}

/**
 * Hata durumu: sunucunun kullanıcıya gösterilebilir mesajı ya da sınıfa göre
 * genel metin. Ham yığın / teknik ayrıntı gösterilmez.
 */
export function ErrorState({ error, onRetry, title = 'Bir şeyler ters gitti' }: { error: unknown; onRetry?: () => void; title?: string }) {
  const message = error instanceof ApiError ? error.message : 'Beklenmedik bir sorunla karşılaştık. Bir daha dener misin?';
  const retryable = !(error instanceof ApiError) || error.transient || error.kind === 'invalid_response' || error.kind === 'rate_limited';
  return (
    <View style={styles.state} accessibilityRole="alert">
      <Text variant="sectionTitle">{title}</Text>
      <Text tone="secondary">
        {message}
      </Text>
      {onRetry && retryable ? <Button label="Tekrar dene" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

/** İskelet satırlar; hareket azaltma açıkken animasyonsuz. */
export function Skeleton({ rows = 4 }: { rows?: number }) {
  const { reduceMotion } = useDesign();
  const opacity = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.6, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);
  return (
    <View accessibilityLabel="Yükleniyor" accessibilityRole="progressbar" style={styles.skeleton}>
      {Array.from({ length: rows }, (_, index) => (
        <Animated.View key={index} style={[styles.skeletonRow, { opacity: reduceMotion ? 0.8 : opacity, width: `${92 - (index % 3) * 14}%` }]} />
      ))}
    </View>
  );
}

export function Banner({ tone = 'info', title, children, action }: PropsWithChildren<{ tone?: Tone; title?: string; action?: ReactNode }>) {
  return (
    <View style={[styles.banner, { backgroundColor: toneColor[tone].soft }]} accessibilityRole={tone === 'critical' || tone === 'warning' ? 'alert' : undefined}>
      {title ? (
        <Text variant="bodyStrong" style={{ color: toneColor[tone].text }}>
          {title}
        </Text>
      ) : null}
      {children ? (
        <Text variant="secondary" style={{ color: toneColor[tone].text }}>
          {children}
        </Text>
      ) : null}
      {action}
    </View>
  );
}

/**
 * Alt sayfa (bottom sheet): modal, ekran okuyucuda odak içeride kalır,
 * arka plana dokunmak veya Android geri tuşu kapatır.
 */
export function BottomSheet({ visible, title, onClose, children }: PropsWithChildren<{ visible: boolean; title: string; onClose: () => void }>) {
  const { reduceMotion } = useDesign();
  return (
    <Modal visible={visible} transparent animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={onClose} accessibilityViewIsModal>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Kapat" />
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text variant="sectionTitle" accessibilityRole="header" style={styles.flex}>
            {title}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Kapat" hitSlop={12} onPress={onClose} style={styles.sheetClose}>
            <X size={20} color={color.textSecondary} />
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetBody}>{children}</ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  state: { alignItems: 'flex-start', gap: space[3], padding: space[4], borderWidth: 1, borderStyle: 'dashed', borderColor: color.borderStrong, borderRadius: radius.card },
  skeleton: { gap: space[3], paddingVertical: space[2] },
  skeletonRow: { height: 16, borderRadius: radius.control, backgroundColor: color.border },
  banner: { borderRadius: radius.card, padding: space[3], gap: space[1] },
  scrim: { flex: 1, backgroundColor: 'rgba(20, 32, 28, 0.32)' },
  sheet: { maxHeight: '85%', backgroundColor: color.canvas, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: space[4], paddingBottom: space[4] },
  sheetHandle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: color.borderStrong, marginTop: space[2] },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: space[3] },
  sheetClose: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  sheetBody: { gap: space[2] },
});
