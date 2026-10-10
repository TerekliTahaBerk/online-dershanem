import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useDesign } from '../theme';
import { color, rowHeight, space } from '../tokens';
import { Text } from './text';

type ScreenProps = PropsWithChildren<{
  /** Kaydırılabilir içerik (varsayılan). Liste ekranları kendi FlatList'ini kullanır. */
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: Edge[];
  footer?: ReactNode;
  contentStyle?: ViewStyle;
  testID?: string;
}>;

/** Beyaz çalışma alanı, 16px kenar boşluğu, güvenli alan ve isteğe bağlı çekip yenileme. */
export function Screen({ scroll = true, refreshing = false, onRefresh, edges = ['left', 'right'], footer, contentStyle, children, testID }: ScreenProps) {
  const { product } = useDesign();
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      // iOS: klavye açılınca içerik otomatik kayar (odaklı alan görünür kalır).
      automaticallyAdjustKeyboardInsets
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={product.accent} colors={[product.accent]} /> : undefined}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.flex, contentStyle]}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.screen} edges={edges} testID={testID}>
      {body}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

/** Sayfa başlığı: tek h1 (web `PageHeader`). İsteğe bağlı bağlam satırı ve sağ eylem. */
export function PageHeader({ title, description, context, action }: { title: string; description?: string; context?: ReactNode; action?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Text variant="pageTitle" accessibilityRole="header" style={styles.flex}>
          {title}
        </Text>
        {action}
      </View>
      {context ? <View>{context}</View> : null}
      {description ? <Text tone="secondary">{description}</Text> : null}
    </View>
  );
}

/** Bölüm: üst çizgi + başlık; kutu yok (web bölüm + satır dili). */
export function Section({ title, action, children, first = false }: PropsWithChildren<{ title?: string; action?: ReactNode; first?: boolean }>) {
  return (
    <View style={[styles.section, first && styles.sectionFirst]}>
      {title ? (
        <View style={styles.sectionHeader}>
          <Text variant="sectionTitle" accessibilityRole="header" style={styles.flex}>
            {title}
          </Text>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

type RowProps = {
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  testID?: string;
};

/** Liste satırı — 48px min, basılınca nötr vurgu, seçiliyken ürün vurgulu sol çizgi. */
export function Row({ title, subtitle, meta, leading, trailing, onPress, selected = false, disabled = false, accessibilityHint, testID }: RowProps) {
  const { product } = useDesign();
  const content = (
    <>
      {selected ? <View style={[styles.selectedBar, { backgroundColor: product.accentMarker }]} /> : null}
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.flex}>
        <Text variant="bodyStrong">{title}</Text>
        {subtitle ? <Text tone="secondary" variant="secondary">{subtitle}</Text> : null}
      </View>
      {meta ? <Text tone="muted" variant="meta">{meta}</Text> : null}
      {trailing}
      {onPress ? (
        <Text tone="muted" accessibilityElementsHidden importantForAccessibility="no">
          ›
        </Text>
      ) : null}
    </>
  );
  if (!onPress) {
    return (
      <View style={styles.row} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, selected && { backgroundColor: color.selected }, pressed && { backgroundColor: color.pressed }, disabled && styles.disabled]}>
      {content}
    </Pressable>
  );
}

export const layoutStyles = StyleSheet.create({ flex: { flex: 1 } });

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingHorizontal: space[4], paddingTop: space[4], paddingBottom: space[8], gap: space[6] },
  footer: { paddingHorizontal: space[4], paddingVertical: space[3], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, backgroundColor: color.canvas },
  header: { gap: space[1] },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  section: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, paddingTop: space[4], gap: space[2] },
  sectionFirst: { borderTopWidth: 0, paddingTop: 0 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  row: {
    minHeight: rowHeight.comfortable,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[2],
    paddingHorizontal: space[2],
    marginHorizontal: -space[2],
    borderRadius: 6,
  },
  leading: { minWidth: 24, alignItems: 'center' },
  selectedBar: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 2, borderRadius: 1 },
  disabled: { opacity: 0.45 },
});
