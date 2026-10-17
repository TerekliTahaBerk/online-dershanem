import type { MobileOperationsCenter, MobileOpsGroupFilter } from '@contracts/admin';
import { useRouter, type Href } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Banner, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { color, touchTarget } from '@/design/tokens';
import { fetchOperationsCenter } from '@/lib/api/admin';
import { useReadyBootstrap } from '@/lib/auth/session-provider';
import { formatLongDate, formatShortDateTime } from '@/lib/format/istanbul';
import { expoHrefFor, mapAdminWebPath } from '@/navigation/route-map';

import { QueryView, useAdminQuery, usePullToRefresh } from './shared';
import { FilterChips, HEALTH, MetricGrid, MetricTile, SEVERITY } from './ui';

/**
 * YÖNETİM · OPERASYON MERKEZİ (Faz 1) — web `app/panel/yonetim` ile AYNI
 * anlık görüntü (`getAdminOperationsCenterSnapshot`) ve `?grup=` süzgeci.
 * Salt okuma. Her satır yetkili yönetim menüsündeki hedefe gider; o bölüm
 * henüz native değilse faz etiketli yer tutucu açılır.
 */
export default function OperationsCenterScreen() {
  const router = useRouter();
  const [group, setGroup] = useState<MobileOpsGroupFilter>('tumu');
  const query = useAdminQuery('operations-center', (api, signal) => fetchOperationsCenter(api, group, signal), { params: { group } });
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="admin-operations-center">
      <PageHeader
        title="Operasyon merkezi"
        context={<Text tone="muted" variant="meta">{formatLongDate(new Date())}</Text>}
        action={
          <Pressable accessibilityRole="button" accessibilityLabel="Ara" hitSlop={8} onPress={() => router.push('/admin/search')} style={styles.icon} testID="admin-search-open">
            <Search size={20} color={color.textSecondary} />
          </Pressable>
        }
      />
      <QueryView query={query}>{(center) => <Body center={center} group={group} onGroup={setGroup} />}</QueryView>
    </Screen>
  );
}

function Body({ center, group, onGroup }: { center: MobileOperationsCenter; group: MobileOpsGroupFilter; onGroup: (group: MobileOpsGroupFilter) => void }) {
  const router = useRouter();
  const bootstrap = useReadyBootstrap();
  const navigation = bootstrap.workspace?.navigation ?? null;
  const hrefFor = (webPath: string | null) => expoHrefFor(mapAdminWebPath(webPath, navigation, bootstrap.business));
  const open = (href: string | null) => href && router.push(href as Href);
  return (
    <>
      {center.partialData ? (
        <Banner tone="warning" title="Veri kısmi">
          Bazı kaynaklar okunamadı; gösterilen sayılar eksik olabilir.
        </Banner>
      ) : null}
      <Text tone="secondary" testID="admin-ops-counts">
        {center.openActionCount} açık iş · {center.blockingCount} engelleyici
      </Text>
      <FilterChips label="Alan süzgeci" value={group} onChange={onGroup} options={center.groups.map((entry) => ({ value: entry.id, label: entry.label, count: entry.count }))} />
      <Section title="Gelen kutusu" first>
        {center.actions.length ? (
          center.actions.map((action) => {
            const href = hrefFor(action.webPath);
            return (
              <Row
                key={action.id}
                testID={`admin-action-${action.id}`}
                title={action.title}
                subtitle={[action.subject, action.owner].filter(Boolean).join(' · ')}
                meta={action.ageLabel}
                trailing={<StatusBadge label={SEVERITY[action.severity].label} tone={SEVERITY[action.severity].tone} />}
                onPress={href ? () => open(href) : undefined}
                accessibilityHint={href ? action.ctaLabel : undefined}
              />
            );
          })
        ) : (
          <EmptyState title="Bu alanda açık iş yok ✅" />
        )}
      </Section>
      <Section title="Bugün">
        <MetricGrid>
          {center.summary.map((tile) => {
            const href = hrefFor(tile.webPath);
            return (
              <MetricTile
                key={tile.id}
                testID={`admin-tile-${tile.id}`}
                label={tile.label}
                value={tile.available && tile.value !== null ? String(tile.value) : '—'}
                hint={tile.hint || undefined}
                tone={tile.tone === 'neutral' ? 'neutral' : tile.tone}
                onPress={href ? () => open(href) : undefined}
              />
            );
          })}
        </MetricGrid>
      </Section>
      <Section title="Öğrenci risk dağılımı">
        <Text tone="secondary">
          {center.risk.critical} kritik · {center.risk.watch} izlenecek · {center.risk.normal} normal (toplam {center.risk.total})
        </Text>
      </Section>
      <Section title="Sistem sağlığı">
        {center.health.map((check) => (
          <Row key={check.id} title={check.label} subtitle={check.detail} trailing={<StatusBadge label={HEALTH[check.status].label} tone={HEALTH[check.status].tone} />} testID={`admin-health-${check.id}`} />
        ))}
      </Section>
      {center.activities.length ? (
        <Section title="Son işlemler">
          {center.activities.map((activity) => {
            const href = hrefFor(activity.webPath);
            return <Row key={activity.id} title={activity.text} subtitle={activity.actorLabel} meta={formatShortDateTime(activity.occurredAt)} onPress={href ? () => open(href) : undefined} />;
          })}
        </Section>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({ icon: { minHeight: touchTarget, minWidth: touchTarget, alignItems: 'center', justifyContent: 'center' } });
