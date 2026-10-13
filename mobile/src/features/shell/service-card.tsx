import type { MobileProductCode, MobileProductState } from '@contracts/bootstrap';
import { ArrowUpRight, Check, LockKeyhole } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ProductLogo } from '@/design/brand';
import { Entrance, MotionPressable, motion } from '@/design/motion';
import { Text } from '@/design/primitives/text';
import { productTheme } from '@/design/products';
import { color, space } from '@/design/tokens';

import { PRODUCT_STATE_PRESENTATION } from './labels';

const DETAILS: Record<MobileProductCode, { description: string; features: string }> = {
  OD: { description: 'Birlikte öğren, adım adım ilerle.', features: 'Canlı dersler · Çalışmalar · Gelişim' },
  OK: { description: 'Hedeflerine kendi ritminde yaklaş.', features: 'Haftalık plan · Koçluk · Hedefler' },
  ODK: { description: 'Seviyeni gör, sonraki adımını belirle.', features: 'Denemeler · Sonuçlar · Analiz' },
};

/** One accessible touch target; unavailable services remain understandable. */
export function ServiceCard({ product, pending, disabled, selected = false, index = 0, onPress }: {
  product: { code: MobileProductCode; label: string; state: MobileProductState };
  pending: boolean;
  disabled: boolean;
  selected?: boolean;
  index?: number;
  onPress: () => void;
}) {
  const theme = productTheme(product.code);
  const active = product.state === 'ACTIVE';
  const presentation = PRODUCT_STATE_PRESENTATION[product.state];
  const details = DETAILS[product.code];
  return <Entrance delay={index * motion.stagger}>
    <MotionPressable
      testID={`select-${product.code}`}
      accessibilityRole="button"
      accessibilityLabel={`${product.label}. ${pending ? 'Açılıyor' : active ? 'Panele gir' : presentation.label}`}
      accessibilityHint={active ? details.features : presentation.description}
      accessibilityState={{ disabled, busy: pending, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: active ? theme.accentSoft : color.surfaceSubtle, borderColor: selected ? theme.accent : color.border }, pressed && styles.pressed]}>
      <View style={styles.heading}>
        <ProductLogo product={product.code} size={44} />
        <View style={styles.copy}>
          <Text variant="sectionTitle">{product.label}</Text>
          <Text variant="secondary" tone="secondary">{active ? details.description : presentation.description}</Text>
        </View>
        {selected ? <Check size={18} color={theme.accent} /> : !active ? <LockKeyhole size={18} color={color.textMuted} /> : null}
      </View>
      {active ? <Text variant="meta" tone="secondary">{details.features}</Text> : null}
      <View style={styles.foot}>
        <Text variant="bodyStrong" style={{ color: active ? theme.accent : color.textMuted }}>{pending ? 'Panelin hazırlanıyor…' : active ? 'Panele gir' : presentation.label}</Text>
        {pending ? <ActivityIndicator size="small" color={theme.accent} /> : active ? <ArrowUpRight size={18} color={theme.accent} /> : null}
      </View>
    </MotionPressable>
  </Entrance>;
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: space[4], gap: space[3] },
  heading: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3], paddingTop: space[2], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.borderStrong, minHeight: 32 },
  pressed: { opacity: 0.86 },
});
