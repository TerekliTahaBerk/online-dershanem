import type { MobileOdkExamRow } from '@contracts/odk';
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Row, StatusBadge, Text } from '@/design/primitives';
import { useDesign } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { formatShortDateTime } from '@/lib/format/istanbul';

import { formatNet, rowHref } from './model';

/** Aile kodu küçük etiketi (ürün vurgusu yalnız işarette; zemin nötr). */
export function FamilyTag({ family }: { family: string }) {
  const { product } = useDesign();
  return (
    <View style={[styles.tag, { backgroundColor: product.accentSoft }]}>
      <Text variant="caption" tone="accent" accentColor={product.accent}>{family || 'Deneme'}</Text>
    </View>
  );
}

/** Deneme satırı — durum, etiket ve ton SUNUCUDAN (`studentExamState`). */
export function OdkExamRow({ exam }: { exam: MobileOdkExamRow }) {
  const router = useRouter();
  const href = rowHref(exam);
  const meta = [exam.startsAt ? formatShortDateTime(exam.startsAt) : 'Tarih bekleniyor', exam.durationMinutes ? `${exam.durationMinutes} dk` : null].filter(Boolean).join(' · ');
  return (
    <Row
      testID={`odk-exam-${exam.id}`}
      title={exam.title}
      subtitle={meta}
      leading={<FamilyTag family={exam.family} />}
      meta={exam.net !== null ? `${formatNet(exam.net)} net` : null}
      trailing={<StatusBadge label={exam.state.label} tone={exam.state.tone} />}
      onPress={href ? () => router.push(href as Href) : undefined}
      accessibilityHint={exam.state.key === 'RESULT_RELEASED' ? 'Açıklanan sonucu açar.' : 'Deneme ayrıntısını açar.'}
    />
  );
}

const styles = StyleSheet.create({ tag: { paddingHorizontal: space[1] + 2, paddingVertical: 2, borderRadius: radius.control } });
