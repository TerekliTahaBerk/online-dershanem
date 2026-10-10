import type { PropsWithChildren, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions, type ViewStyle } from 'react-native';
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
  backgroundColor?: string;
}>;

/** Beyaz çalışma alanı, 16px kenar boşluğu, güvenli alan ve isteğe bağlı çekip yenileme. */
export function Screen({ scroll = true, refreshing = false, onRefresh, edges = ['left', 'right'], footer, contentStyle, children, testID, backgroundColor = color.canvas }: ScreenProps) {
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
    <SafeAreaView style={[styles.screen, { backgroundColor }]} edges={edges} testID={testID}>
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
        <Text variant="pageTitle" accessibilityRole="header" style={styles.headerTitle}>
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
          <Text variant="sectionTitle" accessibilityRole="header" style={styles.headerTitle}>
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
  const { width, fontScale } = useWindowDimensions();
  const stacked = Boolean(meta || trailing) && (width < 340 || fontScale > 1.35 || (width < 420 && (Boolean(trailing) || (meta?.length ?? 0) > 24)));
  const content = (
    <>
      {selected ? <View style={[styles.selectedBar, { backgroundColor: product.accentMarker }]} /> : null}
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.flex}>
        <Text variant="bodyStrong">{title}</Text>
        {subtitle ? <Text tone="secondary" variant="secondary">{subtitle}</Text> : null}
      </View>
      {meta || trailing ? <View style={[styles.trailing, stacked && styles.trailingStacked]}>
        {meta ? <Text tone="muted" variant="meta" style={[styles.meta, stacked && styles.metaStacked]}>{meta}</Text> : null}
        {trailing}
      </View> : null}
      {onPress ? (
        <ChevronRight style={stacked ? styles.stackedChevron : undefined} size={16} color={color.textMuted} accessibilityElementsHidden importantForAccessibility="no" />
      ) : null}
    </>
  );
  if (!onPress) {
    return (
      <View accessibilityState={{ selected, disabled }} style={[styles.row, stacked && styles.stackedRow, selected && { backgroundColor: product.accentSoft }, disabled && styles.disabled]} testID={testID}>
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
      style={({ pressed }) => [styles.row, stacked && styles.stackedRow, selected && { backgroundColor: product.accentSoft }, pressed && { backgroundColor: color.pressed }, disabled && styles.disabled]}>
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
  headerTitle: { flexGrow: 1, flexShrink: 1, flexBasis: 160 },
  trailing: { maxWidth: '45%', flexShrink: 1, alignItems: 'flex-end', gap: space[1] },
  meta: { textAlign: 'right' },
  metaStacked: { textAlign: 'left' },
  headerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] },
  section: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, paddingTop: space[4], gap: space[2] },
  sectionFirst: { borderTopWidth: 0, paddingTop: 0 },
  sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] },
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
  stackedRow: { flexWrap: 'wrap', paddingRight: space[6] },
  stackedChevron: { position: 'absolute', right: space[2], top: space[4] },
  trailingStacked: { maxWidth: '100%', width: '100%', alignItems: 'flex-start', paddingLeft: space[1] },
  leading: { minWidth: 24, alignItems: 'center' },
  selectedBar: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 2, borderRadius: 1 },
  disabled: { opacity: 0.45 },
});
