import type { MobileMaterial } from '@contracts/student';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, EmptyState, PageHeader, Screen, StatusBadge, Text } from '@/design/primitives';
import { color, space } from '@/design/tokens';
import { fetchMaterials } from '@/lib/api/student';

import { QueryView, useOdQuery, usePullToRefresh } from './shared';
import { canOpenMaterial, useMaterialOpener } from './use-material-opener';

/**
 * OD · KAYNAKLAR — web `app/panel/ogrenci/materyaller` karşılığı. Sıralama
 * ve "tercihinle uyumlu" işareti sunucudan (`GET /api/panel/materials`).
 * Kimlikli dosya Bearer başlığıyla indirilir (token URL'e girmez) ve
 * kullanıcıya özel önbellek dizinine yazılır; dış bağlantı yalnız http(s).
 */
const KIND_LABEL: Record<MobileMaterial['kind'], string> = { PDF: 'PDF', VIDEO: 'Video', LINK: 'Bağlantı' };

export default function OdMaterialsScreen() {
  const query = useOdQuery('materials', (api, signal) => fetchMaterials(api, signal));
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="od-materials">
      <PageHeader title="Kaynaklar" description="Öğretmenlerinin paylaştığı PDF, video ve bağlantılar." />
      <QueryView query={query}>
        {(data) => {
          if (!data.profile) return <EmptyState title="Profilin hazırlanıyor." body="Öğrenci profilin tamamlandığında kaynakların burada listelenir." />;
          if (!data.materials.length) return <EmptyState title="Henüz paylaşılan kaynak yok." body="Öğretmenin bir kaynak paylaştığında burada görünecek." />;
          return (
            <>
              {data.lowDataMode ? <Banner tone="info">Düşük veri modu açık: metin dökümü olan kaynaklar önde.</Banner> : null}
              {data.materials.map((material) => (
                <MaterialItem key={material.id} material={material} />
              ))}
            </>
          );
        }}
      </QueryView>
    </Screen>
  );
}

function MaterialItem({ material }: { material: MobileMaterial }) {
  const opener = useMaterialOpener();
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const openable = canOpenMaterial(material);
  const error = opener.errorFor(material.id);

  return (
    <View style={styles.item} testID={`material-${material.id}`}>
      <View style={styles.badges}>
        <StatusBadge label={KIND_LABEL[material.kind]} />
        {material.preferred ? <StatusBadge label="Tercihinle uyumlu" tone="success" /> : null}
        {material.captionsAvailable ? <StatusBadge label="Altyazı var" tone="info" /> : null}
        {material.transcript ? <StatusBadge label="Metin dökümü var" tone="info" /> : null}
      </View>
      <Text variant="bodyStrong">{material.title}</Text>
      <Text tone="muted" variant="meta">{`${material.subject} · ${material.groupName}`}</Text>
      {material.description ? <Text tone="secondary">{material.description}</Text> : null}
      {error ? <Banner tone="critical">{error}</Banner> : null}
      <View style={styles.actions}>
        {openable ? (
          <Button
            testID={`material-open-${material.id}`}
            label={material.hasFile ? 'Dosyayı aç' : material.kind === 'VIDEO' ? 'Videoyu aç' : 'Bağlantıyı aç'}
            variant="secondary"
            loading={opener.openingId === material.id}
            onPress={() => void opener.open(material)}
            accessibilityHint={material.hasFile ? 'Dosya güvenli bağlantıyla indirilir ve paylaşım ekranında açılır.' : 'Tarayıcıda veya ilgili uygulamada açılır.'}
          />
        ) : null}
        {material.transcript ? (
          <Button label={transcriptOpen ? 'Metin dökümünü gizle' : 'Metin dökümünü oku'} variant="quiet" onPress={() => setTranscriptOpen((value) => !value)} />
        ) : null}
      </View>
      {transcriptOpen && material.transcript ? (
        <View style={styles.transcript} accessibilityLabel="Metin dökümü">
          <Text tone="secondary" selectable>
            {material.transcript}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { gap: space[1], paddingVertical: space[3], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[1] },
  transcript: { backgroundColor: color.surfaceSubtle, borderRadius: 8, padding: space[3] },
});
