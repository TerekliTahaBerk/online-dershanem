import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { StatusBadge, Text } from '@/design/primitives';
import { useDesign } from '@/design/theme';
import { color, radius, space, touchTarget, type Tone } from '@/design/tokens';

/**
 * YÖNETİM UI KİTİ (Faz 1) — tasarım primitiflerinin üzerine yönetim
 * ekranlarının ortak parçaları: yatay süzgeç çipleri, metrik kutuları,
 * önem / sağlık rozetleri. Yeni renk icat edilmez; tonlar tasarım
 * token'larından gelir.
 */

export function FilterChips<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string; count?: number }[]; onChange: (value: T) => void; label: string }) {
  const { product } = useDesign();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" accessibilityLabel={label} contentContainerStyle={styles.chips}>
      {options.map((option) => {
        const selected = option.value === value;
        const text = option.count === undefined ? option.label : `${option.label} · ${option.count}`;
        return (
          <Pressable
            key={option.value}
            testID={`chip-${option.value}`}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={text}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [styles.chip, selected && { borderColor: product.accent, backgroundColor: product.accentSoft }, pressed && !selected && styles.pressed]}>
            <Text variant={selected ? 'bodyStrong' : 'secondary'} style={selected ? { color: product.accent } : undefined}>
              {text}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function MetricTile({ label, value, hint, tone = 'neutral', onPress, testID }: { label: string; value: string; hint?: string; tone?: Tone; onPress?: () => void; testID?: string }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={`${label}: ${value}`} testID={testID} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
      <Text variant="meta" tone="muted">{label}</Text>
      <Text variant="numeric">{value}</Text>
      {hint ? <StatusBadge label={hint} tone={tone} /> : null}
    </Pressable>
  );
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

export const SEVERITY: Record<'BLOCKING' | 'ACTION_REQUIRED' | 'WATCH', { label: string; tone: Tone }> = {
  BLOCKING: { label: 'Engelleyici', tone: 'critical' },
  ACTION_REQUIRED: { label: 'İşlem gerekli', tone: 'warning' },
  WATCH: { label: 'İzle', tone: 'info' },
};

export const HEALTH: Record<'ok' | 'degraded' | 'down' | 'unknown', { label: string; tone: Tone }> = {
  ok: { label: 'Sağlıklı', tone: 'success' },
  degraded: { label: 'Yavaş', tone: 'warning' },
  down: { label: 'Çalışmıyor', tone: 'critical' },
  unknown: { label: 'Bilinmiyor', tone: 'neutral' },
};

const styles = StyleSheet.create({
  chips: { gap: space[2], paddingVertical: space[1] },
  chip: { minHeight: touchTarget, justifyContent: 'center', paddingHorizontal: space[3], borderRadius: radius.pill, borderWidth: 1, borderColor: color.border, backgroundColor: color.canvas },
  pressed: { backgroundColor: color.pressed },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  tile: { flexGrow: 1, flexBasis: '45%', minHeight: touchTarget * 2, padding: space[3], gap: space[1], borderRadius: radius.card, borderWidth: 1, borderColor: color.border, backgroundColor: color.surfaceSubtle },
});
