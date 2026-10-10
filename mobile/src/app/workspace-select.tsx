import type { MobileProductCode } from '@contracts/bootstrap';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { ProductLogo } from '@/design/brand';
import { color, radius, space } from '@/design/tokens';
import { PRODUCT_STATE_PRESENTATION } from '@/features/shell/labels';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';

/**
 * Çalışma alanı seçimi (web `/panel/urun-sec` karşılığı). Seçim yetki
 * vermez; sunucuya yazılır ve bootstrap yeniden çekilir. Tek aktif ürün
 * varsa kullanıcıya sorulmadan o ürün seçilir — yine sunucu üzerinden.
 */
export default function WorkspaceSelectScreen() {
  const { state, selectWorkspace, signOut } = useSession();
  const [pending, setPending] = useState<MobileProductCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoTried = useRef<MobileProductCode | null>(null);
  const bootstrap = state.status === 'WORKSPACE_SELECTION' ? state.bootstrap : null;
  const autoSelect = state.status === 'WORKSPACE_SELECTION' ? state.autoSelect : null;

  async function choose(code: MobileProductCode) {
    setPending(code);
    setError(null);
    try {
      await selectWorkspace(code);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Çalışma alanı seçilemedi.');
    } finally {
      setPending(null);
    }
  }

  useEffect(() => {
    // Aynı ürün için bir kez denenir; sunucu reddederse kullanıcı seçici görür (döngü yok).
    if (autoSelect && autoTried.current !== autoSelect) {
      autoTried.current = autoSelect;
      void choose(autoSelect);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnız sunucunun önerdiği tek ürün değiştiğinde tetiklenir
  }, [autoSelect]);

  const products = bootstrap?.workspace?.products ?? [];
  const hasActive = products.some((product) => product.state === 'ACTIVE');


  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.identity}><ProductLogo size={32} /><Text variant="bodyStrong" style={{ flex: 1 }}>{bootstrap?.user.fullName ?? 'Hoş geldin'}</Text></View>
      <PageHeader title="Hangi panele girmek istiyorsun?" description="Panelini seç; istediğin zaman menüdeki “Panel değiştir” ile diğerine geçebilirsin." />
      {error ? <Banner tone="critical">{error}</Banner> : null}
      {hasActive ? null : (
        <EmptyState
          title="Aktif çalışma alanın yok"
          body={products.some((product) => product.state === 'PREPARING') ? 'Öğrenci hesabı açıldığında çalışma alanın burada aktif olacak.' : 'Hesabında aktif bir ürün bulunmuyor. Sorun olduğunu düşünüyorsan ekibimizle iletişime geç.'}
        />
      )}
      <Section first>
        {products.map((product) => {
          const presentation = PRODUCT_STATE_PRESENTATION[product.state];
          return (
            <View key={product.code} style={styles.product}>
            <Row
              testID={`select-${product.code}`}
              title={product.label}
              subtitle={product.state === 'ACTIVE' ? PRODUCT_DESCRIPTION[product.code] : presentation.description}
              leading={<ProductLogo product={product.code} size={48} />}
              trailing={<StatusBadge label={pending === product.code ? 'Açılıyor…' : presentation.label} tone={presentation.tone} />}
              disabled={product.state !== 'ACTIVE' || pending !== null}
              onPress={product.state === 'ACTIVE' ? () => void choose(product.code) : undefined}
            />
            </View>
          );
        })}
      </Section>
      <Button label="Çıkış yap" variant="quiet" onPress={() => void signOut()} />
    </Screen>
  );
}

const PRODUCT_DESCRIPTION = { OD: 'Çok dersli canlı öğrenme', OK: 'Planlama ve sürdürülebilir takip', ODK: 'Ölçme, analiz ve sonraki adım' };
const styles = StyleSheet.create({ identity: { flexDirection: 'row', alignItems: 'center', gap: space[3] }, product: { borderWidth: 1, borderColor: color.border, borderRadius: radius.card, paddingHorizontal: space[3], paddingVertical: space[2], marginBottom: space[3] } });
