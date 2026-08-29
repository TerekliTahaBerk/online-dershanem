import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';

/**
 * Web panelinin `components/panel/ui.tsx` karşılığı — aynı token'lar,
 * birebir. Kaynak: `app/globals.css` (`--panel-card-shadow: none` —
 * "Onaylı tasarımda panel kartı gölgesizdir") ve canlı ekran görüntüsü
 * doğrulaması (2026-08-20). Web'in kart/başlık dilini İCAT ETMİYORUZ,
 * birebir taşıyoruz — mobil kendi yorumunu KATMAZ.
 */

export function Card({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

export function PanelHeading({ title, description }: { title: string; description?: string }) {
  return (
    <View style={styles.headingGroup}>
      <ThemedText style={styles.heading}>{title}</ThemedText>
      {description ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.headingDescription}>
          {description}
        </ThemedText>
      ) : null}
    </View>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <ThemedText style={styles.cardTitle}>{children}</ThemedText>;
}

export function SectionLabel({ children }: { children: string }) {
  return (
    <ThemedText style={styles.sectionLabel} themeColor="textSecondary">
      {children.toLocaleUpperCase('tr-TR')}
    </ThemedText>
  );
}

/** Web'deki `h-2 rounded-full bg-dc-line-soft` track + dolgu — bant rengi opsiyonel (hedefler). */
export function ProgressBar({ percent, color }: { percent: number; color?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${clamped}%`, backgroundColor: color ?? BrandColors.brand }]} />
    </View>
  );
}

/** Ders bazlı net gösterimi (Denemeler ekranı) — düz metin DEĞİL, web'deki gibi yatay bar. */
export function BarRow({ label, value, meta }: { label: string; value: number; meta: string }) {
  return (
    <View style={styles.barRow}>
      <View style={styles.barRowHeader}>
        <ThemedText type="small">{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {meta}
        </ThemedText>
      </View>
      <ProgressBar percent={value} />
    </View>
  );
}

/** Web'deki kesikli çerçeveli boş durum — 16px radius, kart primitifinden AYRI (14px değil).
 * Bütün-sayfa engelleyici boş durumlar için (`components/panel/empty-state.tsx` karşılığı). */
export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyState}>
      <ThemedText style={styles.cardTitle}>{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.emptyStateBody}>
        {body}
      </ThemedText>
    </View>
  );
}

/** Web'in `PanelEmpty`'si — normal (kesiksiz çerçeveli) `Card`, liste-içi boş durumlar için
 * ("Yaklaşan ders yok" gibi). `EmptyState`'ten (kesikli çerçeve) KASITLI olarak ayrı — web'de de iki
 * farklı boş-durum kalıbı var, aynı bileşene birleştirilmedi. */
export function ListEmpty({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <ThemedText style={styles.listEmptyTitle}>{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {body}
      </ThemedText>
    </Card>
  );
}

/**
 * Web'in `SubjectTrendCard`/Denemeler trend grafiğinin ortak SVG çizim
 * mantığı — `viewBox="0 0 640 H"`, üç yatay ızgara çizgisi, seri başına
 * `polyline`. Tek seri (Denemeler) ya da çoklu seri (Gelişim) aynı bileşen.
 */
export function LineChart({ series, height = 180 }: { series: { color: string; points: number[] }[]; height?: number }) {
  const W = 640;
  const all = series.flatMap((s) => s.points);
  const pointCount = series[0]?.points.length ?? 0;
  if (!all.length || pointCount < 2) return null;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const step = W / (pointCount - 1);

  const toPoints = (points: number[]) =>
    points.map((n, i) => `${Math.round(i * step)},${Math.round(height - 30 - ((n - min) / span) * (height - 60))}`).join(' ');

  return (
    <Svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height}>
      {[height * 0.17, height * 0.5, height * 0.83].map((y) => (
        <Line key={y} x1={0} y1={y} x2={W} y2={y} stroke={BrandColors.lineSoft} strokeWidth={1} />
      ))}
      {series.map((s, i) => (
        <Polyline key={i} points={toPoints(s.points)} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" />
      ))}
    </Svg>
  );
}

/** Web'in `PanelFilterLink`'i — aktifte dolu yeşil, pasifte ince çerçeveli. */
export function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.filterChip, active ? styles.filterChipActive : styles.filterChipInactive]}>
      <ThemedText type="smallBold" style={active ? styles.filterChipLabelActive : styles.filterChipLabelInactive}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BrandColors.line,
    backgroundColor: '#ffffff',
    padding: 22,
    gap: Spacing.two,
  },
  headingGroup: { gap: 6 },
  heading: { fontSize: 26, lineHeight: 32.5, fontWeight: '800', letterSpacing: -0.5 },
  headingDescription: { marginTop: 0 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  sectionLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.8 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: BrandColors.lineSoft, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  barRow: { gap: 6 },
  barRowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: BrandColors.line,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 44,
    alignItems: 'center',
    gap: Spacing.one,
  },
  emptyStateBody: { textAlign: 'center' },
  listEmptyTitle: { fontSize: 15, fontWeight: '700' },
  filterChip: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  filterChipActive: { backgroundColor: BrandColors.brandStrong },
  filterChipInactive: { borderWidth: 1, borderColor: '#DDE4E0', backgroundColor: '#ffffff' },
  filterChipLabelActive: { color: '#ffffff' },
  filterChipLabelInactive: { color: '#5C6B65' },
});
